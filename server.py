# -*- coding: utf-8 -*-
"""一日手账 — 静态托管 + 云同步轻量后端"""
import os
import json
import time
import hashlib
from flask import Flask, request, jsonify, send_from_directory, abort

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "sync_data")
os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__, static_folder=os.path.join(BASE, "public"), static_url_path="")


def code_file(code):
    """同步口令只做 sha256 落盘文件名，不明文存储"""
    h = hashlib.sha256(("yiri-shouzhang::" + code).encode("utf-8")).hexdigest()[:24]
    return os.path.join(DATA_DIR, h + ".json")


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/sync/<code>", methods=["GET"])
def sync_pull(code):
    p = code_file(code)
    if not os.path.exists(p):
        return jsonify({"日记": {}, "云端更新时间": None})
    with open(p, encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/sync/<code>", methods=["POST"])
def sync_push(code):
    body = request.get_json(force=True, silent=True) or {}
    diary = body.get("日记")
    if not isinstance(diary, dict):
        abort(400, description="bad payload")
    payload = {"日记": diary, "云端更新时间": time.strftime("%Y-%m-%d %H:%M:%S")}
    with open(code_file(code), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    return jsonify({"ok": True, "云端更新时间": payload["云端更新时间"]})


@app.after_request
def no_cache_api(resp):
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port)
