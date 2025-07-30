import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging.js";

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
const messaging = getMessaging(app);

const msrtcRoutes = {
    "AURANGABAD-MUMBAI": {
        start: { lat: 19.8762, lng: 75.3433 }, 
        end: { lat: 19.0760, lng: 72.8777 },  
        distance: 330, 
        scheduledTime: 480 
    },
    "PUNE-NASHIK": {
        start: { lat: 18.5204, lng: 73.8567 }, 
        end: { lat: 20.0059, lng: 73.7622 },   
        distance: 210,
        scheduledTime: 240 
    },
    "NAGPUR-PUNE": {
        start: { lat: 21.1458, lng: 79.0882 }, 
        end: { lat: 18.5204, lng: 73.8567 },  
        distance: 720,
        scheduledTime: 720 
    }
};

const buses = {
    "MSRTC-101": { route: "AURANGABAD-MUMBAI", delayProbability: 0.3 },
    "MSRTC-202": { route: "PUNE-NASHIK", delayProbability: 0.2 },
    "MSRTC-303": { route: "NAGPUR-PUNE", delayProbability: 0.4 }
};

let map;
let busMarkers = {};
let selectedBus = null;
let routePolyline = null;

window.database = database;
window.firebase = { database: { ServerValue: { TIMESTAMP: serverTimestamp } } };

window.initializeApp = function() {
    try {
        console.log("Firebase initialized successfully");

        if (typeof google !== 'undefined') {
            initMap();
            setupUI();
            simulateAllBuses();
            requestNotificationPermission();
            setupFirebaseMessaging();
        } else {
            console.error("Google Maps not loaded");
        }
    } catch (err) {
        console.error("Initialization error:", err);
    }
};

function initMap() {
    const defaultCenter = { lat: 19.7515, lng: 75.7139 }; 

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultCenter,
        zoom: 7,
        mapId: "DEMO_MAP_ID",
        streetViewControl: false
    });

    map.addListener("click", () => {
        if (selectedBus) {
            selectedBus = null;
            document.getElementById("bus-details").innerHTML = "<p>Select a bus to view details</p>";
        }
    });
}

function setupUI() {
    const searchBtn = document.getElementById("search-btn");
    const busSearch = document.getElementById("bus-search");

    searchBtn.addEventListener("click", () => {
        const searchTerm = busSearch.value.trim().toUpperCase();
        if (searchTerm) {
            if (buses[searchTerm]) {
                selectBus(searchTerm);
            } else {
                const matchingBuses = Object.keys(buses).filter(
                    busId => buses[busId].route.includes(searchTerm)
                );
                if (matchingBuses.length > 0) {
                    selectBus(matchingBuses[0]);
                } else {
                    alert("No bus found with that number or route");
                }
            }
        }
    });
}

function selectBus(busId) {
    selectedBus = busId;
    const busRef = ref(database, `buses/${busId}`);
    
    onValue(busRef, (snapshot) => {
        const busData = snapshot.val();
        if (busData) {
            updateBusDetails(busId, busData);
            
            const busPos = { lat: busData.latitude, lng: busData.longitude };
            map.setCenter(busPos);
            map.setZoom(12);
            
            if (!routePolyline || routePolyline.busId !== busId) {
                showRoute(busId, buses[busId].route);
            }
        }
    });
}

function updateBusDetails(busId, busData) {
    const routeInfo = msrtcRoutes[buses[busId].route];
    const distanceCovered = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(routeInfo.start.lat, routeInfo.start.lng),
        new google.maps.LatLng(busData.latitude, busData.longitude)
    ) / 1000; 
    
    const remainingDistance = routeInfo.distance - distanceCovered;
    const progress = (distanceCovered / routeInfo.distance) * 100;
    const eta = remainingDistance / (busData.speed || 50) * 60; 
    
    const scheduledETA = routeInfo.scheduledTime - (routeInfo.scheduledTime * (progress / 100));
    const isDelayed = eta > scheduledETA + 30; 
    
    if (isDelayed) {
        showDelayBanner();
        checkAndSendNotification(busId);
    } else {
        hideDelayBanner();
    }
    
    const detailsHTML = `
        <h3>${busId} - ${buses[busId].route}</h3>
        <p><strong>Current Location:</strong> ${busData.latitude.toFixed(4)}, ${busData.longitude.toFixed(4)}</p>
        <p><strong>Speed:</strong> ${busData.speed || 50} km/h</p>
        <p><strong>ETA to Destination:</strong> ${Math.round(eta)} minutes</p>
        <p><strong>Progress:</strong> ${progress.toFixed(1)}% completed</p>
        <p><strong>Status:</strong> ${isDelayed ? '<span style="color: var(--danger)">DELAYED</span>' : 'On Time'}</p>
    `;
    
    document.getElementById("bus-details").innerHTML = detailsHTML;
}

function showRoute(busId, routeName) {
    if (routePolyline) {
        routePolyline.setMap(null);
    }
    
    const route = msrtcRoutes[routeName];
    const routePath = [
        new google.maps.LatLng(route.start.lat, route.start.lng),
        new google.maps.LatLng(route.end.lat, route.end.lng)
    ];
    
    routePolyline = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 0.5,
        strokeWeight: 3,
        map: map
    });
    
    routePolyline.busId = busId;
}

function simulateAllBuses() {
    Object.keys(buses).forEach(busId => {
        simulateBusMovement(busId, buses[busId].route, buses[busId].delayProbability);
    });
}

function simulateBusMovement(busId, routeName, delayProbability) {
    const route = msrtcRoutes[routeName];
    const busRef = ref(database, `buses/${busId}`);
    
    let lat = route.start.lat + (Math.random() * 0.1 - 0.05);
    let lng = route.start.lng + (Math.random() * 0.1 - 0.05);
    
    const latStep = (route.end.lat - route.start.lat) / 1000;
    const lngStep = (route.end.lng - route.start.lng) / 1000;
    
    let speed = 50 + Math.random() * 20; 
    let isDelayed = false;
    
    if (!busMarkers[busId]) {
        busMarkers[busId] = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: busId,
            icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/bus.png",
                scaledSize: new google.maps.Size(40, 40)
            }
        });
        
        busMarkers[busId].addListener("click", () => {
            selectBus(busId);
        });
    }
    
    const interval = setInterval(() => {
        lat += latStep;
        lng += lngStep;
        
        if (Math.random() < 0.1) {
            speed = Math.max(30, speed + (Math.random() * 20 - 10));
        }
        
        if (!isDelayed && Math.random() < delayProbability) {
            speed = Math.max(10, speed * 0.5);
            isDelayed = true;
        }
        
        const newPos = { lat, lng };
        
        set(busRef, {
            busId: busId,
            route: routeName,
            latitude: lat,
            longitude: lng,
            speed: Math.round(speed),
            timestamp: serverTimestamp(),
            isDelayed: isDelayed
        });
        
        busMarkers[busId].setPosition(newPos);
        
        if (selectedBus === busId) {
            const busData = {
                latitude: lat,
                longitude: lng,
                speed: Math.round(speed)
            };
            updateBusDetails(busId, busData);
        }
        
        const distanceToEnd = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(lat, lng),
            new google.maps.LatLng(route.end.lat, route.end.lng)
        );
        
        if (distanceToEnd < 5000) { 
            lat = route.start.lat + (Math.random() * 0.1 - 0.05);
            lng = route.start.lng + (Math.random() * 0.1 - 0.05);
            speed = 50 + Math.random() * 20;
            isDelayed = false;
        }
    }, 2000);
    
    window.addEventListener('beforeunload', () => clearInterval(interval));
}

function showDelayBanner() {
    const banner = document.getElementById("delay-banner");
    banner.classList.add("show");
}

function hideDelayBanner() {
    const banner = document.getElementById("delay-banner");
    banner.classList.remove("show");
}

function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            console.log("Notification permission granted");
            getToken(messaging, { vapidKey: 'BN3Q3K8gKd2l29FcB3dHVJhd66GBXQ6ZTHEe3bkqt6Jxaz0q0jJJHewRCN2fOPbKdsx-Nl-j-vVGOE6XjAkC5IU' }).then((currentToken) => {
                if (currentToken) {
                    console.log("FCM token:", currentToken);
                } else {
                    console.log('No registration token available.');
                }
            }).catch((err) => {
                console.log('An error occurred while retrieving token. ', err);
            });
        }
    });
}

function setupFirebaseMessaging() {
    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: 'https://maps.google.com/mapfiles/ms/icons/bus.png'
        };
        
        if (Notification.permission === "granted") {
            new Notification(notificationTitle, notificationOptions);
        } else {
            alert(`${notificationTitle}: ${payload.notification.body}`);
        }
    });
}

function checkAndSendNotification(busId) {
    if (Notification.permission === "granted") {
        const notificationOptions = {
            body: `Bus ${busId} on route ${buses[busId].route} is delayed`,
            icon: 'https://maps.google.com/mapfiles/ms/icons/bus.png'
        };
        new Notification(`Bus Delay Alert`, notificationOptions);
    }
}