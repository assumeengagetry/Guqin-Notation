from flask import Flask, render_template, request, jsonify
import json

app = Flask(__name__)

# --- 核心数据配置 ---

# 正调定弦 (Standard Tuning F调: 5 6 1 2 3 5 6)
# 键格式: "音高_八度" (pitch_octave)
# 值: 弦号 (1-7)
STANDARD_TUNING_MAP = {
    "5_-1": 1,  # 低音5 -> 1弦
    "6_-1": 2,  # 低音6 -> 2弦
    "1_0":  3,  # 中音1 -> 3弦
    "2_0":  4,  # 中音2 -> 4弦
    "3_0":  5,  # 中音3 -> 5弦
    "5_0":  6,  # 中音5 -> 6弦
    "6_0":  7,  # 中音6 -> 7弦 (注意：有时也作低音6的高八度，此处按标准正调算中音6)
    
    # 容错补充：有些谱子可能把1弦记作倍低音5，这里只做简单的正调散音映射
}

# 数字转汉字映射
NUM_TO_CN = {1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七"}

# --- 路由 ---

@app.route('/')
def index():
    """渲染主页"""
    return render_template('index.html')

@app.route('/api/convert', methods=['POST'])
def convert():
    """
    API接口: 简谱 JSON -> 古琴谱 JSON
    """
    try:
        input_data = request.json
        output_data = {
            "song_info": input_data.get("meta", {}),
            "render_queue": []
        }

        # 遍历所有简谱事件
        for event in input_data.get("events", []):
            
            # 1. 处理小节线
            if event["type"] == "bar_line":
                output_data["render_queue"].append({"type": "bar_line"})
                continue
            
            # 2. 处理音符
            if event["type"] == "note":
                pitch = event.get("pitch")
                octave = event.get("octave", 0)
                
                # 构造查找键 (例如: "6_-1")
                key = f"{pitch}_{octave}"
                
                # --- 算法核心：查找散音 ---
                string_idx = STANDARD_TUNING_MAP.get(key)
                
                if string_idx:
                    # 找到了对应的散音弦！
                    
                    # 规则：6、7弦通常用勾(勹)，1-5弦通常用挑(乚)
                    # 这只是一个基础规则，实际演奏看情况，但作为算法足够用了
                    right_hand_tech = "勹" if string_idx >= 6 else "乚"

                    # 构造简谱显示 (加点)
                    display_jianpu = str(pitch)
                    if octave == -1: display_jianpu += "̣" # 下点
                    elif octave == 1: display_jianpu += "̇" # 上点

                    # 构造古琴字符组件
                    guqin_char = {
                        "type": "guqin_char",
                        "id": event.get("id"),
                        "layout_mode": "open_string", # 散音模式
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
                    # 如果没找到散音（比如是按音），暂时用一个占位符或者跳过
                    # 这里为了演示，我们生成一个“空”字符
                    pass

        return jsonify(output_data)

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("启动古琴算法服务器...")
    app.run(debug=True, port=5000)