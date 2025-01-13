Qualtrics.SurveyEngine.addOnload(function () {
    var mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found. Ensure the HTML contains a <div id="map"> element.');
        return;
    }

    // Create map and set initial view
    var map = L.map('map').setView([37, -120], 7); // Initial view position
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var markers = []; // Store markers
    var polyline = L.polyline([], { color: 'blue', weight: 4 }).addTo(map); // Store path
    var distance = 0; // Calculate total path distance
    var addresses = []; // Store address information

    // Add geocoder
    var geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: "Enter address or postal code..."
    }).on('markgeocode', function (event) {
        var latlng = event.geocode.center;
        map.setView(latlng, 13);
        L.marker(latlng).addTo(map).bindPopup(event.geocode.name).openPopup();
    }).addTo(map);

    // Map click event: Add marker and path
    map.on('click', function (e) {
        var latlng = e.latlng;
        var marker = L.marker(latlng).addTo(map);
        markers.push({ marker: marker, latlng: latlng });
        polyline.addLatLng(latlng);
        calculateDistance(); // Update distance
        getAddress(latlng); // Get address information
    });

    // Map right-click event: End path drawing
    map.on('contextmenu', function () {
        if (markers.length > 1) {
            alert('Path completed!');
            saveDataToQualtrics(); // Save data
        } else {
            alert('At least two points are needed to complete the path.');
        }
    });

    // Clear button event: Clear all markers and path
    document.getElementById('clearButton').addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all paths and markers?')) {
            clearAll();
        }
    });

    // Calculate total path distance
    function calculateDistance() {
        var totalDistance = 0;
        var pathPoints = polyline.getLatLngs();
        for (var i = 1; i < pathPoints.length; i++) {
            totalDistance += pathPoints[i - 1].distanceTo(pathPoints[i]);
        }
        distance = totalDistance / 1000; // Convert to kilometers
    }

    // Clear all markers and path
    function clearAll() {
        markers.forEach(m => map.removeLayer(m.marker));
        markers = [];
        polyline.setLatLngs([]);
        document.getElementById('result').innerHTML = 'All paths cleared.';
        distance = 0;
        addresses = [];
    }

    // Fetch address from latitude and longitude
    function getAddress(latlng) {
        const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json&addressdetails=1&accept-language=en`;
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data && data.address) {
                    addresses.push(data.address);
                    displayAddresses();
                }
            })
            .catch(console.error);
    }

    // Display address list
    function displayAddresses() {
        const addressListContainer = document.getElementById('addressList');
        addressListContainer.innerHTML = '';
        addresses.forEach(function (address, index) {
            let fullAddress = [
                address.house_number ? `${address.house_number} ${address.road || ''}`.trim() : '',
                address.city,
                address.county,
                address.state,
                address.country,
                address.postcode
            ].filter(Boolean).join(', ');
            const addressElement = document.createElement('div');
            addressElement.textContent = `${index + 1}. ${fullAddress || 'No address found'}`;
            addressListContainer.appendChild(addressElement);
        });
    }

    // Save data to Qualtrics
    function saveDataToQualtrics() {
        var pathData = polyline.getLatLngs().map(latlng => `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`).join(" -> ");
        var addressData = addresses.map(addr => {
            return [
                addr.house_number ? `${addr.house_number} ${addr.road || ''}`.trim() : '',
                addr.city,
                addr.county,
                addr.state,
                addr.country,
                addr.postcode
            ].filter(Boolean).join(', ');
        }).join(" | ");
        var textArea = document.getElementById('QR~QID1');
        if (textArea) {
            textArea.value = `Distance: ${distance.toFixed(2)} km\nPath: ${pathData}\nAddresses: ${addressData}`;
        } else {
            console.error('Text Entry element not found');
        }
    }
});
