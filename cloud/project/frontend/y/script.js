let map;
let userLat = 45.9432; // Default to Romania center
let userLng = 24.9668;
let userMarker = null;
let clickedLat = null;
let clickedLng = null;
let currentInfoWindow = null;
let markers = [];

navigator.geolocation.getCurrentPosition(
    (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        console.log('Location detected:', userLat, userLng);
        if (map) {
            addUserMarker();
            centerOnUser();
        }
    },
    (error) => {
        console.warn("Geolocation failed:", error.message);
        showNotification("Using default location. Enable location services for better experience.", "warning");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
);

function initMap() {
    const mapStyles = [
        {
            "featureType": "all",
            "elementType": "geometry.fill",
            "stylers": [{"weight": "2.00"}]
        },
        {
            "featureType": "all",
            "elementType": "geometry.stroke",
            "stylers": [{"color": "#9c9c9c"}]
        },
        {
            "featureType": "all",
            "elementType": "labels.text",
            "stylers": [{"visibility": "on"}]
        },
        {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [{"color": "#f2f2f2"}]
        },
        {
            "featureType": "landscape",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "landscape.man_made",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [{"visibility": "off"}]
        },
        {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{"saturation": -100}, {"lightness": 45}]
        },
        {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#eeeeee"}]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#7b7b7b"}]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [{"visibility": "simplified"}]
        }
    ];

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: userLat, lng: userLng },
        zoom: 8,
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative'
    });

    map.addListener("click", (e) => {
        clickedLat = e.latLng.lat();
        clickedLng = e.latLng.lng();
        showForm();
        showNotification("Great! Now fill in your study group details.", "success");
    });

    addUserMarker();
    loadPosts();
}

function addUserMarker() {
    if (userMarker) userMarker.setMap(null);
    
    userMarker = new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map: map,
        title: "Your Location",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285f4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2
        },
        animation: google.maps.Animation.DROP
    });
}

function showForm() {
    const form = document.getElementById("postForm");
    form.style.display = "block";
    form.classList.add("fadeIn");
}

function cancelForm() {
    const form = document.getElementById("postForm");
    form.style.display = "none";
    form.reset();
    form.classList.remove("fadeIn");
    clickedLat = null;
    clickedLng = null;
}

// Center map on user location
function centerOnUser() {
    if (map && userLat && userLng) {
        map.panTo({ lat: userLat, lng: userLng });
        map.setZoom(12);
        if (userMarker) {
            userMarker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => userMarker.setAnimation(null), 2000);
        }
        showNotification("Centered on your location!", "info");
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("postForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="loading"></div> Creating...';
            submitBtn.disabled = true;

            const title = document.getElementById("title").value;
            const description = document.getElementById("description").value;

            try {
                const response = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/add_post", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        description,
                        lat: clickedLat || userLat,
                        lng: clickedLng || userLng,
                    }),
                });

                if (response.ok) {
                  await loadPosts();       
                  cancelForm();            
                  showNotification("🎉 Study group created successfully!", "success");
              } else {
                  throw new Error('Failed to create study group');
              }
            } catch (error) {
                console.error('Error:', error);
                showNotification("❌ Failed to create study group. Please try again.", "error");
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

async function loadPosts() {
    try {
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        const response = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/posts");
        const posts = await response.json();

        posts.forEach((post, index) => {
            if (!post.lat || !post.lng) return;

            const marker = new google.maps.Marker({
                position: { lat: post.lat, lng: post.lng },
                map: map,
                title: post.title,
                icon: {
                    path: "M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13C19,5.13 15.87,2 12,2z",
                    fillColor: "#6366f1",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                    scale: 1.5,
                    anchor: new google.maps.Point(12, 24)
                },
                animation: google.maps.Animation.DROP
            });

            markers.push(marker);

            const content = `
                <div class="custom-info-window">
                    <div class="info-title">
                        <i class="fas fa-users"></i>
                        ${post.title}
                    </div>
                    <div class="info-description" id="desc-${post.id}">
                        ${post.description}
                    </div>
                    <div class="info-controls">
                        <select class="translate-dropdown" id="lang-${post.id}">
                            <option value="en">🇺🇸 English</option>
                            <option value="ro">🇷🇴 Romanian</option>
                            <option value="fr">🇫🇷 French</option>
                            <option value="es">🇪🇸 Spanish</option>
                            <option value="de">🇩🇪 German</option>
                            <option value="it">🇮🇹 Italian</option>
                        </select>
                        <button class="btn btn-small" onclick="translatePost('${post.id}', \`${post.description.replace(/`/g, '\\`')}\`)">
                            <i class="fas fa-language"></i>
                            Translate
                        </button>
                        <button class="btn btn-small" onclick="speakPost('${post.id}')">
                            <i class="fas fa-volume-up"></i>
                            Speak
                        </button>

                       
                    </div>
                </div>
            `;

            const infoWindow = new google.maps.InfoWindow({ content });

            marker.addListener("click", () => {
                if (currentInfoWindow) currentInfoWindow.close();
                infoWindow.open(map, marker);
                currentInfoWindow = infoWindow;
            });
        });
    } catch (error) {
        console.error("Failed to load posts:", error);
        showNotification("⚠️ Could not load study groups. Please try again later.", "error");
    }
}

function translatePost(postId, originalText) {
    const langSelect = document.getElementById(`lang-${postId}`);
    const targetLang = langSelect ? langSelect.value : "ro";

    fetch("https://chess-backend-1020982385745.europe-west1.run.app/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText, target: targetLang }),
    })
    .then(res => res.json())
    .then(data => {
    const element = document.getElementById(`desc-${postId}`);
    if (element) {
        element.innerText = data.translated_text;
        speakText(data.translated_text);  
    }
    showNotification("✅ Translated successfully!", "success");
});

}

function closeInfoWindow() {
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
    }
}

function speakText(text) {
    fetch("https://chess-backend-1020982385745.europe-west1.run.app/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
    .then(res => res.blob())
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
    })
    .catch(err => {
        console.error("Text-to-speech error:", err);
        showNotification("❌ Failed to generate speech.", "error");
    });
}

function speakPost(postId) {
    const text = document.getElementById(`desc-${postId}`).innerText;
    const lang = document.getElementById(`lang-${postId}`)?.value || "en";

    fetch("https://chess-backend-1020982385745.europe-west1.run.app/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, target: lang }),
    })
    .then(response => response.blob())
    .then(blob => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
    })
    .catch(err => {
        console.error("TTS error:", err);
        showNotification("❌ Failed to play audio.", "error");
    });
}





document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("noteFile");
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    const response = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/upload_note", {
        method: "POST",
        body: formData
    });

    if (response.ok) {
        showNotification("📚 Note uploaded!", "success");
        loadNotes();
    } else {
        showNotification("❌ Upload failed.", "error");
    }
});

async function loadNotes() {
    const res = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/notes");
    const notes = await res.json();

    const container = document.getElementById("notesList");
    container.innerHTML = notes.map(note => `
        <div class="note-item">
            <a href="${note.url}" target="_blank">${note.name}</a>
        </div>
    `).join('');
}




async function saveNote() {
    const noteContent = document.getElementById("notesArea").value;

    const res = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/save_note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteContent)
    });

    if (res.ok) {
        showNotification("✅ Note saved!", "success");
    } else {
        showNotification("❌ Failed to save note.", "error");
    }
}



async function loadFiles() {
    const container = document.getElementById("fileList");
    
    // Show loading state
    container.innerHTML = '<div class="file-list-loading">Loading files...</div>';
    
    try {
        const res = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/files");
        const files = await res.json();
        
        if (files.length === 0) {
            container.innerHTML = '<div class="file-list-empty">No files uploaded yet</div>';
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="note-item">
                <a href="${file.url}" target="_blank">${file.name}</a>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="file-list-empty" style="color: var(--error);">Failed to load files</div>';
    }
}

function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
      <i class="fas fa-info-circle"></i>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function showMap() {
  document.querySelector(".map-container").style.display = "block";
  document.getElementById("notes-section").style.display = "none";
  document.getElementById("upload-section").style.display = "none";
}

function showNotes() {
  document.querySelector(".map-container").style.display = "none";
  document.getElementById("notes-section").style.display = "block";
  document.getElementById("upload-section").style.display = "none";
    loadNotes();
}

function showUpload() {
  document.querySelector(".map-container").style.display = "none";
  document.getElementById("notes-section").style.display = "none";
  document.getElementById("upload-section").style.display = "block";
  loadFiles();
}

document.addEventListener("DOMContentLoaded", function () {
  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("fileInput");
      if (!fileInput || !fileInput.files.length) return;

      const formData = new FormData();
      formData.append("file", fileInput.files[0]);

      try {
        const res = await fetch("https://chess-backend-1020982385745.europe-west1.run.app/upload_file", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          showNotification("📂 File uploaded!", "success");
          fileInput.value = "";
          loadFiles();
        } else {
          throw new Error("Upload failed");
        }
      } catch (err) {
        console.error(err);
        showNotification("❌ Upload failed", "error");
      }
    });
  }
});
