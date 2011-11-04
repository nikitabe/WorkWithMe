var map, 
    geocoder,
    placeApi,
    infowindow,
    myLoc,
	myLocMarker,
	myExistingPosMarker,
    defaultArea = 1000,
    markersList = [],
    placesList = [],
    defaultTypes = 'store gym food cafe bar street_address point_of_interest administrative_area_level_1 administrative_area_level_2 administrative_area_level_3 colloquial_area country floor intersection locality natural_feature neighborhood political point_of_interest post_box postal_code postal_code_prefix postal_town premise room route street_address street_number sublocality sublocality_level_4 sublocality_level_5 sublocality_level_3 sublocality_level_2 sublocality_level_1 subpremise transit_station'.split(" "),
	map_fields = 'loc_geopt_lat loc_geopt_lng where_name where_addr where_detail'.split(" "),
	default_zoom = 15;


function init_map_stuff ( complete_func ) {
    var pi0 = new google.maps.LatLng(0, 0);
    
    map = new google.maps.Map(document.getElementById('map_canvas'), {
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            center: pi0,
            zoom: default_zoom
        });
    infowindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();
    init_btn_act();
    findMeFnc( complete_func );


}

function init_btn_act() {
    $("#searchBtn").click( function () {
        searchFnc();
    });
	$("#where").keydown( function(event){
		if (event.keyCode == '13') {
			searchFnc();
		}
	});
}
function searchFnc() {
	$("#map_working").html( 'Looking, searching, digging...').slideDown( 'fast');
	$("#map_error").slideUp( 'fast');
	$("#map_success").slideUp( 'fast' );
	
    var sTxt = $("#where").val();
    $("#searchResults").html("");
    if (sTxt.length<0) {
        $("#searchResults").html("Type at least 0 chars.>");
        $("#searchResults").slideDown( 'slow');
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
            pStore += "<li>" + pickMeStr( place.geometry.location.lat(), place.geometry.location.lng(), pName, pVicinity ) + "<a href='#"+address+"' class='address' onclick=\"showOnlyPlace('"+i+"');\">"+extAddress+"</a></li>";
            dBounds.extend(place.geometry.location);

        }
        map.fitBounds(dBounds);
		if( map.getZoom() > default_zoom ){
			map.setZoom( default_zoom );
		}
        $("#searchResults").html("<ul>"+pStore+"</ul>");

		$("#map_working").slideUp( 'fast');
		$("#map_error").slideUp( 'fast');
		$("#map_success").html( 'Found some places. Please select the one where you are at.' ).slideDown( 'slow' );

		$("#searchResults").slideDown( 'slow');		
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
						google.maps.event.addListener(marker, 'click', function( marker ) {
							infowindow.setContent( addr + pickMeStr( marker.getPosition().lat(), marker.getPosition().lng(), "", addr ) );
							infowindow.open(map, this);
						});
						pStore += "<li>" + pickMeStr( marker.getPosition().lat(), marker.getPosition().lng(), "", addr ) + "<a href='#"+addr+"' onclick=\"showOnlyPlace('"+j+"');\">"+addr+"</a></li>";
						dBounds.extend(results[j].geometry.location);
					})(results, j); //end fnc
				}
				map.fitBounds(dBounds);
				if( map.getZoom() > default_zoom ){
					map.setZoom( default_zoom );
				}
				$("#searchResults").html("<ul>"+pStore+"</ul>");
				$("#searchResults").slideDown( 'slow');				
				$("#map_working").slideUp( 'fast');
		    	$("#map_success").html( 'Found this address.' ).slideDown( "slow" );
			} else {
				$("#searchResults").slideUp( 'fast');
				$("#map_success").slideUp( 'fast');
				$("#map_working").slideUp( 'fast');
				$("#map_error").html('Sorry, nothing found.').slideDown( 'slow');
			}


        });
    }
}

function pickMeStr( lat, lng, name, addr )
{
	return " <div class='btn' onclick=\"setMyPositionTo(" + lat + "," + lng + ", '" + escape(name) + "', '" + escape(addr) + "')\">I am here</div>";
}

function createEventMarker( lat, lng, message  )
{
	var spot = new google.maps.LatLng( lat, lng );
    var marker = new google.maps.Marker({
            map: map,
            position: spot
    });

    markersList.push({marker:marker});
    google.maps.event.addListener(marker, 'click', function( marker ) {
        infowindow.setContent( message );
        infowindow.open(map, this);
    });
	console.log( "creating marker!");
	return marker;	
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
                infowindow.setContent(p.types[0] + ": " +p.name + ", " + p.vicinity + pickMeStr( placeLoc.lat(), placeLoc.lng(), p.name, p.vicinity ) );
                infowindow.open(map, this);
            });
}

function clearMyLocMarker(){
	if( myLocMarker ){
		myLocMarker.setMap( null );
		myLocMarker = 0;
	}
}

function cleanMarkerList() {
    for(var i=0;i<markersList.length;i++) {
        markersList[i].marker.setMap(null);
    }
    if (myLoc && myLoc.setMap) {
        myLoc.setMap(null);
    }
	$("#loc_geopt_lat").val( "" );  
    $("#loc_geopt_lng").val( "" );
}

function showOnlyPlace(pid) {
    var marker = markersList[pid].marker;
    var p = markersList[pid].place;  
	var lat = marker.position.lat()
	var lng = marker.position.lng()
    infowindow.setContent(p.formatted_address || p.types[0] + ": " +p.name + ", " + p.vicinity );
    infowindow.open(map, marker);
    map.panTo(p.geometry.location);
    return false;
}

function findMeFnc( complete_func ) {
	$("#map_working").html( 'Looking for you...').slideDown( 'slow');
	$("#map_error").slideUp( 'fast');
	$("#map_success").slideUp( 'fast');

	clearMyLocMarker();
    if (navigator &&
            (ng = navigator.geolocation) &&
            ng.getCurrentPosition) {
        ng.getCurrentPosition( function( pos ){ 
								locFound( pos, complete_func );
							   }, locNoFound);
	} else {
		$("#map_working").slideUp( 'fast', function(){
        	$("#map_error").html("<h3>Your browser does not support geolocation.  <button class='btn' name='findMeBtn'' id='findMeBtn' value='Find Me'>Try Again!</button></h3>");
			$("#map_error").slideDown( 'slow');
		});
    }

}

function setMyPositionTo( lat, lng, where_name, where_addr )
{
	clearMyLocMarker();
    for(var i=0;i<markersList.length;i++) {
		marker = markersList[i].marker;
		if( marker.getPosition().lat() != lat && marker.getPosition().lng() != lng )
        	marker.setMap(null);
    }

	$("#new_loc_geopt_lat").val( lat );  
    $("#new_loc_geopt_lng").val( lng );	
	$("#new_where_name").val( unescape( where_name ) );
	$("#new_where_addr").val( unescape( where_addr ) );	
	$("#step_confirm").slideDown( 'slow' );
	$("#searchResults").slideUp( 'fast');

    map.setCenter( new google.maps.LatLng(lat,lng) );
	infowindow.close();
}

function copy_val( destination, source_prefix, dest_prefix )
{
	$( "#" + dest_prefix + destination ).val( $("#" + source_prefix + destination).val() );
}

function initMyExistingPosition()
{
	for( var i in map_fields )
		copy_val( map_fields[i], "", "new_" );	

	// Need to implement setting up of a marker for current position
	// myExistingPosMarker = ?

}

function applyMyNewPosition()
{	
	for( var i in map_fields )
		copy_val( map_fields[i], "new_", "" );
		
}
function locFound( pos, complete_func ) {
	console.log( "in logFound " + Math.random());
	$("#map_working").slideUp( 'fast', function(){
    	$("#map_success").html("I found you! Now take a look at the places around you...").slideDown( "slow" );
	});

    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;
	myLoc = new google.maps.LatLng(lat,lng);

    myLocMarker = new google.maps.Marker({
		map: map,
		position: myLoc,
		animation: google.maps.Animation.DROP,
		icon: '/images/markers/blue_MarkerA.png'
    });

    google.maps.event.addListener(myLocMarker, 'click',
            function() {
                infowindow.setContent( "My location!" );
                infowindow.open(map, myLocMarker);
            });
    map.setCenter(myLoc);
    map.setZoom(default_zoom);

	// Need to call listener because that is when the bounds actually change
	listener_handle = google.maps.event.addListener(map, 'bounds_changed', function() {
	 	if( typeof( complete_func ) != 'undefined' ){
			complete_func();
			google.maps.event.removeListener(listener_handle);
		}	
		
	});

}

var listener_handle;

function locNoFound( error ) { 
	$("#map_working").slideUp( 'fast', function(){
    	$("#map_error").html("Can't find you :( <button class='btn' name='findMeBtn'' id='findMeBtn' value='Find Me'>Find Me Again!</button> or type in your address below.").slideDown( "slow" );
	});
	
}
