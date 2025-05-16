let player;
let tiempoInicio = null;
let tiempoFin = null;

// Cargar la API de YouTube y crear el reproductor
function onYouTubeIframeAPIReady() {
  const videoContainer = document.getElementById("videoContainer");
  videoContainer.innerHTML = `<div id="player"></div>`;

  player = new YT.Player("player", {
    height: "360",
    width: "640",
    videoId: "", // Se setea más adelante
    events: {
      onReady: () => console.log("Player listo"),
    },
  });
}

// Cargar video nuevo desde URL
function loadVideo() {
  const url = document.getElementById("youtubeUrl").value;
  const videoId = extractYouTubeID(url);

  if (!videoId) {
    alert("URL inválida. Asegúrate de que sea un link de YouTube.");
    return;
  }

  // 1. Pedir al backend que descargue el video silenciosamente
  fetch("/descargar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error("Error al descargar:", data.error);
      alert("Hubo un problema al preparar el video para recortar.");
    } else {
      console.log("Video descargado o ya presente:", data.video_id);
    }
  });

  // 2. Cargar el reproductor embebido de YouTube
  const container = document.getElementById("videoContainer");
  container.innerHTML = '<div id="player"></div>';

  player = new YT.Player("player", {
    height: "360",
    width: "640",
    videoId: videoId,
    events: {
      onReady: () => console.log("Player listo"),
    },
  });
}

function extractYouTubeID(url) {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|watch)\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

document.getElementById("btnInicio").addEventListener("click", () => {
  if (player && player.getCurrentTime) {
    tiempoInicio = player.getCurrentTime().toFixed(2);
    document.getElementById("inicioTiempo").textContent = tiempoInicio + " s";
  }
});

document.getElementById("btnFin").addEventListener("click", () => {
  console.log("Botón Fin fue presionado");

  if (player && player.getCurrentTime) {
    tiempoFin = player.getCurrentTime().toFixed(2);
    document.getElementById("finTiempo").textContent = tiempoFin + " s";

    if (tiempoInicio !== null) {
      player.pauseVideo(); // Se pausa ANTES del prompt

setTimeout(() => {
  const nombre = prompt("¿Cómo querés llamar a este fragmento?");
  if (nombre) {
    const videoUrl = document.getElementById("youtubeUrl").value;
    const videoId = extractYouTubeID(videoUrl);

    const fragmento = {
      nombre: nombre,
      inicio: parseFloat(tiempoInicio),
      fin: parseFloat(tiempoFin),
      video_id: videoId
    };
const li = document.createElement("li");
li.innerHTML = `
  <strong>${fragmento.nombre}</strong><br>
  ${formatearTiempo(fragmento.inicio)} - ${formatearTiempo(fragmento.fin)}
  <br>
  <button class="descargar-btn">⬇ Descargar</button>
`;

li.querySelector(".descargar-btn").addEventListener("click", () => {
  fetch("/recortar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(fragmento)
  })
  .then(res => res.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fragmento.nombre}.mp4`;
    a.click();
  });
});

document.getElementById("listaFragmentos").appendChild(li);
          // Resetear tiempos
          tiempoInicio = null;
          tiempoFin = null;
          document.getElementById("inicioTiempo").textContent = "-";
          document.getElementById("finTiempo").textContent = "-";

          // ✅ Volver a reproducir el video
          player.playVideo();
        }
      }, 100); // Le da tiempo a pausar antes del prompt
    } else {
      alert("Primero marcá el inicio del fragmento.");
    }
  }
});;

function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60).toString().padStart(2, "0");
  return `${min}:${seg}`;
}