var map, 
    geocoder,
    placeApi,
    infowindow,
    myLoc,
    defaultArea = 5000,
    markersList = [],
    placesList = [],
    defaultTypes = 'store gym food cafe bar street_address point_of_interest administrative_area_level_1 administrative_area_level_2 administrative_area_level_3 colloquial_area country floor intersection locality natural_feature neighborhood political point_of_interest post_box postal_code postal_code_prefix postal_town premise room route street_address street_number sublocality sublocality_level_4 sublocality_level_5 sublocality_level_3 sublocality_level_2 sublocality_level_1 subpremise transit_station'.split(" ");


function init_map_stuff () {
    var pi0 = new google.maps.LatLng(0, 0);
    
    map = new google.maps.Map(document.getElementById('map_canvas'), {
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            center: pi0,
            zoom: 15
        });
    infowindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();
    init_btn_act();
    findMeFnc();
}

function init_btn_act() {
    $("#findMeBtn").click( function () {
        findMeFnc();
    });
    $("#searchBtn").click( function () {
        searchFnc();
    });
}
function searchFnc() {
    var sTxt = $("#where").val();
    $("#searchResults").html("");
    if (sTxt.length<5) {
        $("#searchResults").html("<h3>Type at least 5 chars</h3>");
    } else {
        var placeApi = new google.maps.places.PlacesService(map);
        var searchRequest = {
            name: sTxt,
            location: myLoc ||  new google.maps.LatLng(0, 0),
            radius: defaultArea,
            types: defaultTypes
                                                    };
        placeApi.search(searchRequest, procSearchResponse);
    }
}

function procSearchResponse(r,s) {
    placesList = [];
    cleanMarkerList();
    markersList = [];
    var pStore = "";
    var dBounds = new google.maps.LatLngBounds();
    if (s == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < r.length; i++) {
            var place = r[i];
            placesList.push(place);
            createMarker(r[i]); 
            
            var pName = r[i].name;
            var pType  = r[i].types[0];
            var pid    = r[i].id;
            var pVicinity = r[i].vicinity;
            var address = pName + " " + pVicinity;
            var extAddress = pType +": "+ address;
            pStore += "<li><a href='#"+address+"' onclick=\"showOnlyPlace('"+i+"');\">"+extAddress+"</a></li>";
            dBounds.extend(place.geometry.location);

        }
        map.fitBounds(dBounds);
        $("#searchResults").html("<ul>"+pStore+"</ul>");
        
    } else {
        var sTxt = $("#where").val();
        geocoder.geocode( { 'address': sTxt}, function(results, stat) {
                if (stat == google.maps.GeocoderStatus.OK) {
                            for(var j=0; j<results.length; j++) {
                            (function (results, j) {
                                var addr = results[j].formatted_address;  
                                map.setCenter(results[j].geometry.location);
                                var marker = new google.maps.Marker({
                                        map: map,
                                        position: results[j].geometry.location
                                });
                                markersList.push({marker:marker, place: results[j]});
                                google.maps.event.addListener(marker, 'click', function() {
                                    infowindow.setContent(addr || "aici");
                                    infowindow.open(map, this);
                            
                                });
                                pStore += "<li><a href='#"+addr+"' onclick=\"showOnlyPlace('"+j+"');\">"+addr+"</a></li>";
                                dBounds.extend(results[j].geometry.location);

                            })(results, j); //end fnc
                            }
                        map.fitBounds(dBounds);
                        $("#searchResults").html("<ul>"+pStore+"</ul>");
        
                    } else {
                        $("#searchResults").html("<h1>Nothing found</h1>");
                    }
        });
    }
}
function createMarker(p) {
    var placeLoc = p.geometry.location;
    var marker = new google.maps.Marker({
                    map: map,
                    position: placeLoc 
                });
    markersList.push({marker: marker, place: p} );     
    google.maps.event.addListener(marker, 'click', 
            function() {
                infowindow.setContent(p.types[0] + ": " +p.name + ", " + p.vicinity);
                infowindow.open(map, this);
            });
}
function cleanMarkerList() {
    for(var i=0;i<markersList.length;i++) {
        markersList[i].marker.setMap(null);
    }
    if (myLoc && myLoc.setMap) {
        myLoc.setMap(null);
    }
}

function showOnlyPlace(pid) {
    var marker = markersList[pid].marker;
    var p = markersList[pid].place;  
    infowindow.setContent(p.formatted_address || p.types[0] + ": " +p.name + ", " + p.vicinity);
    infowindow.open(map, marker);
    map.panTo(p.geometry.location);
    return false;
}

function findMeFnc() {
    cleanMarkerList();
    if (navigator &&
            (ng = navigator.geolocation) &&
            ng.getCurrentPosition) {
        ng.getCurrentPosition(locFound, locNoFound);
        $("#searchResults").html("<h3>I found you!</h3>");
    } else {
        $("#searchResults").html("<h3>Your browser does not support geolocation</h3>");
    }

}
function locFound(pos) {
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;
    var mM = myLoc = new google.maps.LatLng(lat,lng);
    var marker = new google.maps.Marker({
                map: map,
                position: mM
    });
    markersList.push({marker: marker, place: $("#where").text()});
    google.maps.event.addListener(marker, 'click',
            function() {
                infowindow.setContent($("#where").text());
                infowindow.open(map, marker);
            });
    map.setCenter(mM);
    map.setZoom(16);
}
function locNoFound() { 
    $("#searchResults").html("<h3>Your browser does not support geolocation</h3>");
}
