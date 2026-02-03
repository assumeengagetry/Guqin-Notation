from flask import Flask, render_template, request, jsonify
import xml.etree.ElementTree as ET
import re

app = Flask(__name__)

# --- 1. 扩充后的正调定弦表 (F调) ---
# 逻辑：Key="简谱数字_八度" -> Value=弦号
# 假设 C4(Middle C) = 1_0 (中音1)
STANDARD_TUNING_MAP = {
    # --- 低音区 (Octave -1) ---
    "5_-1": 1,  # G3 -> 1弦
    "6_-1": 2,  # A3 -> 2弦
    
    # --- 中音区 (Octave 0) ---
    "1_0":  3,  # C4 -> 3弦
    "2_0":  4,  # D4 -> 4弦
    "3_0":  5,  # E4 -> 5弦
    "5_0":  6,  # G4 -> 6弦
    "6_0":  7,  # A4 -> 7弦

    # --- 高音区 (Octave 1) ---
    # 古琴正调散音只有 1-7 根弦。
    # 如果 XML 里出现了高音(如 C5, D5)，散音弹不出来。
    # 但为了演示不报错，这里做一个“降八度”的Hack处理，或者映射到泛音位（这里简化为映射到同名散音）
    "1_1": 3,   # C5 -> 借用3弦
    "2_1": 4,   # D5 -> 借用4弦
    "3_1": 5,   # E5 -> 借用5弦
    "5_1": 6,   # G5 -> 借用6弦
    "6_1": 7,   # A5 -> 借用7弦
}

NUM_TO_CN = {1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七"}

# --- MusicXML 解析工具 ---
def parse_musicxml(xml_content):
    """
    将 MusicXML 字符串解析为简谱事件列表
    策略：只提取 Part P1 的 Staff 1 (右手旋律)，忽略休止符和伴奏
    """
    events = []
    
    # 去除 XML 命名空间，防止解析麻烦
    xml_content = re.sub(r'\sxmlns="[^"]+"', '', xml_content, count=1)
    
    try:
        root = ET.fromstring(xml_content)
        
        # 简谱映射字典 (C Major: C=1, D=2...)
        step_to_pitch = {'C': 1, 'D': 2, 'E': 3, 'F': 4, 'G': 5, 'A': 6, 'B': 7}
        
        # 遍历所有小节
        for measure in root.findall(".//measure"):
            # 添加小节线
            if len(events) > 0 and events[-1]["type"] != "bar_line":
                events.append({"type": "bar_line"})

            # 遍历小节内的音符
            for note in measure.findall("note"):
                # 1. 过滤：跳过休止符
                if note.find("rest") is not None:
                    continue
                
                # 2. 过滤：只取 Staff 1 (通常是右手/主旋律)
                staff = note.find("staff")
                if staff is not None and staff.text != "1":
                    continue
                
                # 3. 提取音高信息
                pitch_node = note.find("pitch")
                if pitch_node is None: continue
                
                step = pitch_node.find("step").text     # C, D, E...
                octave = int(pitch_node.find("octave").text) # 3, 4, 5...
                
                # 4. 转换为简谱逻辑
                # 设定 C4 (Middle C) 为中音 1 (Octave 0)
                pitch_num = step_to_pitch.get(step, 1)
                
                rel_octave = 0
                if octave == 4: rel_octave = 0
                elif octave < 4: rel_octave = octave - 4 # e.g., 3 -> -1
                elif octave > 4: rel_octave = octave - 4 # e.g., 5 -> 1

                # 5. 提取歌词 (如果有的话，MusicXML里是lyric标签，这里暂时留空)
                lyric = "" 
                
                events.append({
                    "type": "note",
                    "id": f"xml_{len(events)}",
                    "pitch": pitch_num,
                    "octave": rel_octave,
                    "lyric": lyric
                })
                
    except Exception as e:
        print(f"XML Parsing Error: {e}")
        return []
        
    return events

# --- 路由 ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/convert', methods=['POST'])
def convert():
    try:
        # 获取原始请求数据
        raw_data = request.data.decode('utf-8')
        
        # 判断是 XML 还是 JSON (为了兼容之前的逻辑)
        input_events = []
        meta_info = {"title": "Uploaded Score"}

        if raw_data.strip().startswith("<?xml") or "<score-partwise" in raw_data:
            # === 分支 A: 处理 MusicXML ===
            input_events = parse_musicxml(raw_data)
            # 尝试从 XML 提取标题
            try:
                root = ET.fromstring(raw_data)
                title = root.find(".//work-title")
                if title is not None: meta_info["title"] = title.text
            except: pass
        else:
            # === 分支 B: 处理之前的 JSON (兼容) ===
            json_data = request.json
            input_events = json_data.get("events", [])
            meta_info = json_data.get("meta", {})

        # === 核心古琴生成逻辑 (共用) ===
        output_data = {
            "song_info": meta_info,
            "render_queue": []
        }

        for event in input_events:
            if event["type"] == "bar_line":
                output_data["render_queue"].append({"type": "bar_line"})
                continue
            
            if event["type"] == "note":
                pitch = event.get("pitch")
                octave = event.get("octave", 0)
                
                key = f"{pitch}_{octave}"
                
                # 查表
                string_idx = STANDARD_TUNING_MAP.get(key)
                
                if string_idx:
                    right_hand_tech = "勹" if string_idx >= 6 else "乚"

                    # 简谱显示字符串
                    display_jianpu = str(pitch)
                    if octave < 0: 
                        # 简单的重复下点逻辑
                        display_jianpu += "̣" * abs(octave) 
                    elif octave > 0: 
                        display_jianpu += "̇" * abs(octave)

                    guqin_char = {
                        "type": "guqin_char",
                        "layout_mode": "open_string",
                        "display_info": {
                            "jianpu": display_jianpu,
                            "lyric": event.get("lyric", "")
                        },
                        "components": {
                            "top": "艹",
                            "bottom_wrapper": right_hand_tech,
                            "bottom_inner": NUM_TO_CN[string_idx]
                        }
                    }
                    output_data["render_queue"].append(guqin_char)
                else:
                    # 如果找不到散音（比如 F音 4），MusicXML里很常见
                    # 这里我们做一个特殊的 "空字符" 用于占位，防止漏掉音符导致节奏全乱
                    # 或者直接显示简谱数字，不显示减字谱
                    output_data["render_queue"].append({
                        "type": "guqin_char",
                        "layout_mode": "open_string",
                        "display_info": { "jianpu": str(pitch), "lyric": "?" },
                        "components": { "top": "", "bottom_wrapper": "", "bottom_inner": "" } # 空白
                    })

        return jsonify(output_data)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)