import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJY7C8KVbYM0fyC8DE0W7ZlLL27M2c_B0",
    authDomain: "bustrackingapp-4dc70.firebaseapp.com",
    databaseURL: "https://bustrackingapp-4dc70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bustrackingapp-4dc70",
    storageBucket: "bustrackingapp-4dc70.appspot.com",
    messagingSenderId: "836091458137",
    appId: "1:836091458137:web:9198878f159a98c331b748",
    measurementId: "G-4GK3K0PJ17"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const busRef = ref(database, 'buses/bus1');

window.database = database;
window.busRef = busRef;
window.firebase = { database: { ServerValue: { TIMESTAMP: serverTimestamp } } };

window.initializeApp = function() {
    try {
        console.log("Firebase initialized successfully");

        if (typeof google !== 'undefined') {
            initMap();
        } else {
            console.error("Google Maps not loaded");
        }
    } catch (err) {
        console.error("Initialization error:", err);
    }
};

function initMap() {
    const defaultCenter = { lat: 40.7128, lng: -74.0060 };

    const map = new google.maps.Map(document.getElementById("map"), {
        center: defaultCenter,
        zoom: 14,
        mapId: "DEMO_MAP_ID",
        streetViewControl: false
    });

    const busMarker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        title: "Bus 1",
        icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/bus.png",
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    simulateBusMovement(busRef, busMarker, map);
}

function updateBusPosition(busMarker, map, newPos) {
    if (!busMarker) return;
    
    busMarker.setPosition(newPos);
    map.panTo(newPos);
    console.log("Bus position updated:", new Date().toLocaleTimeString());
}

function simulateBusMovement(busRef, busMarker, map) {
    if (!busRef) {
        console.error("Cannot simulate movement - Firebase not initialized");
        return;
    }

    let lat = 40.7128;
    let lng = -74.0060;
    let direction = 1;

    const interval = setInterval(() => {
        switch (direction) {
            case 1: lat += 0.001; if (lat >= 40.7228) direction = 2; break;
            case 2: lng += 0.001; if (lng >= -73.9960) direction = 3; break;
            case 3: lat -= 0.001; if (lat <= 40.7128) direction = 4; break;
            case 4: lng -= 0.001; if (lng <= -74.0060) direction = 1; break;
        }

        const newPos = { lat, lng };
        
        set(busRef, {
            latitude: lat,
            longitude: lng,
            timestamp: serverTimestamp(),
            speed: 30,
            route: "Downtown Loop"
        });

        updateBusPosition(busMarker, map, newPos);
    }, 2000);

    window.addEventListener('beforeunload', () => clearInterval(interval));
}