$(window).load(getMyLocation);
function getMyLocation() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			displayLocation, 
			displayError,
			{enableHighAccuracy: false, timeout:10000});
	}
	else {
		var div = $("#location");
		div.html('<h2>Geolocation not supported!</h2>');
	}
}
function getCoordinates(title, address, callback) {

	var contentString = '<h2>' + title + '<h3><p>' + address + '</p>';

	var infowindow = new google.maps.InfoWindow({
	    content: contentString
	});

	var geocoder = new google.maps.Geocoder();

	geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        map.setCenter(results[0].geometry.location);
        callback(results[0].geometry.location);
        var marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: results[0].geometry.location
        });
        markersArray.push(marker);
        google.maps.event.addListener(marker, 'click', function() {
  			infowindow.open(map,marker);
  		});
      } else {
			console.log("Geocode was not successful for the following reason: " + status);
      }
    });
}

function clearMarkers() {
  if (markersArray) {
    for (i in markersArray) {
      markersArray[i].setMap(null);
    }
  }
}

function displayLocation(position) {

	var latitude = position.coords.latitude;
	var longitude = position.coords.longitude;
	//Passback lat and lng to hidden input types for use later
	$("#lat").val(latitude);
	$("#lng").val(longitude);

	var div = document.getElementById("location");
	var latLng = new google.maps.LatLng(latitude, longitude);
	var map;

	geocoder = new google.maps.Geocoder();
	geocoder.geocode({'latLng': latLng}, function(results, status) {
	     if (status == google.maps.GeocoderStatus.OK) {
	       if (results[0]) {
	         	div.innerHTML = results[0]['formatted_address'];
	       }
	     } else {
	       alert("Geocoder failed due to: " + status);
	     }
	   });

	if (map == null) {
		showMap(position.coords);
		prevCoords = position.coords;
	}
	else {
		var meters = computeDistance(position.coords, prevCoords) * 1000;
		if (meters > 20) {
			scrollMapToPosition(position.coords);
			prevCoords = position.coords;
		}
	}
}

// --------------------- Ready Bake ------------------
//
// Uses the Spherical Law of Cosines to find the distance
// between two lat/long points
//
function computeDistance(startCoords, destCoords) {
	var startLatRads = degreesToRadians(startCoords.latitude);
	var startLongRads = degreesToRadians(startCoords.longitude);
	var destLatRads = degreesToRadians(destCoords.latitude);
	var destLongRads = degreesToRadians(destCoords.longitude);

	var Radius = 6371; // radius of the Earth in km
	var distance = Math.acos(Math.sin(startLatRads) * Math.sin(destLatRads) + 
					Math.cos(startLatRads) * Math.cos(destLatRads) *
					Math.cos(startLongRads - destLongRads)) * Radius;
	distance = parseFloat(distance).toFixed(1);

	return distance;
}

function degreesToRadians(degrees) {
	radians = (degrees * Math.PI)/180;
	return radians;
}

function showMap(coords) {
	var googleLatAndLong = new google.maps.LatLng(coords.latitude,
												  coords.longitude);

	var mapOptions = {
		zoom: 13,
		center: googleLatAndLong,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		disableDefaultUI: true,
		draggable: false
	};

	var mapDiv = document.getElementById("map-canvas");

	map = new google.maps.Map(mapDiv, mapOptions);

	// add the user marker
	var title = "<h3>Here You Are!</h3>";
	var content = "";
	addMarker(map, googleLatAndLong, title, content);

	var service = new google.maps.places.PlacesService(map);

	//Add click event to watch for categories clicked
	 $("#categories a").each(function() {
        $(this).click(function() {
            var places =  new Array($(this).attr("data-id"));
            var request = {
            	location: googleLatAndLong,
            	rankBy: google.maps.places.RankBy.DISTANCE,
            	types: places
            };
            service.nearbySearch(request, function(results, status) {
            	console.log("Status: " + status);
            	console.log("Results: " + results);
            	if(status == google.maps.places.PlacesServiceStatus.OK) {
            		printLocationName($.map(results, function(item) {
            			return {
            				reference: item.reference,
            				address: item.formatted_address,
            				name: item.name,
            				latitude: item.geometry.location.lat(),
            				longitude: item.geometry.location.lng()
            			};            			
            		}));
            	}
            	if (status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            		$('#results').html('<span>No results. Sad Panda! </span><img src="http://i474.photobucket.com/albums/rr104/gio_dim/AVerySadPanda.png"/>');
            	}
            })
        });
    });
 	$("#results").on("click", "a",  function(event) {
        map = new google.maps.Map(mapDiv, mapOptions);
        var reference = $(this).attr("data-id");
        request = {
            reference: reference
        };
        service.getDetails(request, function(place, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                var resultsData = {
                	name: place.name,
                	rating: place.rating,
                	address: place.formatted_address,
                	phone: place.formatted_phone_number,
                	icon: place.icon,
                	url: place.url,
                	website: place.website,
                	price: place.price_level
                };
                printPlaceDetails(resultsData);
            }
        });
    });
	function printPlaceDetails(data) {
		console.log(data);
		var content = $("#detailsContent");
		emptyContent(content);
		content.html("<center><h1>" + data.name + "</h1><h3>" + data.address + "</h3><h3>" + data.phone + "</h3><img src='" + data.icon + "'><br /><a target='_blank' href='" + data.url + "'>" + data.name + " on Google+</a><br /></center>");
	}
	function emptyContent(content) {
		content.empty;
	}
	function printLocationName(places) {
		listStart = "<table id=\"resultsTable\" align=\"center\"><th colspan =\"2\">Here's what we found</th>";
		var listEnd = "</table>";
		var addResults = $("#results");
		var content = "", proximity = "", placeCoords = "", currCoords = "", thisLat = "", thisLng = "";
		thisLat = $("#lat").val();
        thisLng = $("#lng").val();
		addResults.empty();
        for (var i = 0; i < places.length; i++) {
        	currCoords = {
        		latitude: thisLat,
        		longitude: thisLng
        	};
        	placeCoords = {
        		latitude: places[i].latitude,
        		longitude: places[i].longitude
        	};
        	proximity = computeDistance(currCoords, placeCoords);
        	content += "<tr><td><a class=\"placeName\" href=\"#details\" data-id=\"" + places[i].reference + "\">" + places[i].name + "</a></td><td>" + proximity + "miles</td></tr>";
        }
        content = listStart + content + listEnd;
       	addResults.append(content);
    }
}


function addMarker(map, latlong, title, content) {
	var markerOptions = {
		position: latlong,
		map: map,
		title: title,
		clickable: true,
		draggable: false
	};
	var marker = new google.maps.Marker(markerOptions);

	var infoWindowOptions = {
		content: title + content,
		position: latlong
	};

	var infoWindow = new google.maps.InfoWindow(infoWindowOptions);

	google.maps.event.addListener(marker, 'click', function() {
		infoWindow.open(map);
	});
}

function displayError(error) {
	// Default location for the time being
	var errorTypes = {
		0: "Unknown error",
		1: "Permission denied",
		2: "Position is not available",
		3: "Request timeout"
	};
	var errorMessage = errorTypes[error.code];
	if (error.code == 0 || error.code == 2) {
		errorMessage = errorMessage + " " + error.message;
	}
	var div = document.getElementById("location");
	div.innerHTML = errorMessage;
}