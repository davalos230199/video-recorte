from flask import Flask, request, send_file, render_template
import yt_dlp
import subprocess
import os
import time
import threading
from datetime import datetime, timedelta

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/descargar", methods=["POST"])
def descargar_video():
    data = request.json
    url = data.get("url")

    if not url:
        return {"error": "No se proporcionó URL"}, 400

    video_id = url.split("v=")[-1].split("&")[0]
    archivo_descargado = f"{video_id}.mp4"

    if os.path.exists(archivo_descargado):
        return {"message": "Ya descargado", "video_id": video_id}

    ydl_opts = {
        'outtmpl': archivo_descargado,
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'merge_output_format': 'mp4',
        'quiet': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return {"message": "Descargado", "video_id": video_id}
    except Exception as e:
        print("Error al descargar:", e)
        return {"error": str(e)}, 500

def eliminar_fragmento_en_segundo_plano(path):
    def borrar():
        time.sleep(5)  # Esperar a que el navegador termine de usar el archivo
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"[INFO] Fragmento eliminado (async): {path}")
            else:
                print(f"[WARNING] Fragmento ya no existe: {path}")
        except Exception as e:
            print(f"[ERROR] Fallo al eliminar {path}: {e}")
    threading.Thread(target=borrar).start()

@app.route("/recortar", methods=["POST"])
def recortar_fragmento():
    data = request.json
    video_id = data["video_id"]
    inicio = data["inicio"]
    fin = data["fin"]
    nombre = data["nombre"]

    archivo_descargado = f"{video_id}.mp4"
    archivo_fragmento = f"{nombre}.mp4"

    if not os.path.exists(archivo_descargado):
        return {"error": "El video no fue descargado aún."}, 400

    try:
        comando = [
            "ffmpeg", "-y",
            "-ss", str(inicio),
            "-to", str(fin),
            "-i", archivo_descargado,
            "-c", "copy",
            archivo_fragmento
        ]
        subprocess.run(comando, check=True)

        eliminar_fragmento_en_segundo_plano(archivo_fragmento)
        return send_file(archivo_fragmento, as_attachment=True)

    except Exception as e:
        print("Error al recortar:", e)
        return {"error": f"Error al recortar: {str(e)}"}, 500

def limpiar_archivos_antiguos(carpeta=".", extension=".mp4", horas=3):
    while True:
        ahora = datetime.now()
        limite = ahora - timedelta(hours=horas)

        for archivo in os.listdir(carpeta):
            if archivo.endswith(extension):
                ruta = os.path.join(carpeta, archivo)
                modificado = datetime.fromtimestamp(os.path.getmtime(ruta))
                if modificado < limite:
                    try:
                        os.remove(ruta)
                        print(f"[LIMPIEZA] Eliminado: {archivo}")
                    except Exception as e:
                        print(f"[ERROR] No se pudo eliminar {archivo}: {e}")
        
        time.sleep(60 * 60 * 3)  # Esperar 3 horas

if __name__ == "__main__":
    threading.Thread(target=limpiar_archivos_antiguos, daemon=True).start()
    app.run(debug=True)
