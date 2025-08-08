# MSRTC Live Bus Tracking Prototype

A web-based live bus tracking system for Maharashtra State Road Transport Corporation (MSRTC) using HTML, CSS, and vanilla JavaScript.

## Features

- Real-time tracking of multiple MSRTC buses on different routes
- Interactive Google Maps interface with bus markers
- Bus search functionality by bus number or route
- Detailed bus information including:
  - Current location (coordinates)
  - Current speed
  - ETA to destination
  - Route progress
  - Delay status
- Automatic delay detection with visual alerts
- Push notifications for delayed buses (via Firebase Cloud Messaging)
- Progressive Web App (PWA) support
- Responsive design works on mobile and desktop

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Mapping**: Google Maps JavaScript API
- **Realtime Database**: Firebase Realtime Database
- **Push Notifications**: Firebase Cloud Messaging
- **Hosting**: Can be deployed on Firebase Hosting or any static web server

## Setup Instructions

### Prerequisites

- Google Maps API key (with Maps JavaScript API enabled)
- Firebase project with Realtime Database and Cloud Messaging enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aaryapandya12/bus-tracking-app.git
   cd msrtc-bus-tracking
