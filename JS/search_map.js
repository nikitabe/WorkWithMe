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
    // defaultTypes = 'store gym cafe food bar street_address point_of_interest administrative_area_level_1 administrative_area_level_2 administrative_area_level_3 colloquial_area country floor intersection locality natural_feature neighborhood political point_of_interest post_box postal_code postal_code_prefix postal_town premise room route street_address street_number sublocality sublocality_level_4 sublocality_level_5 sublocality_level_3 sublocality_level_2 sublocality_level_1 subpremise transit_station'.split(" "),
    defaultTypes = 'store gym cafe food bar street_address point_of_interest floor intersection natural_feature point_of_interest post_box premise room street_address street_number subpremise transit_station'.split(" "),
	map_fields = 'loc_geopt_lat loc_geopt_lng where_name where_addr where_detail'.split(" "),
	div_statuses = 'working error success'.split(" "),
	
	default_zoom = 15;
	
var ADD_MARKER = true,
	NO_MARKER = false;

function init_map_stuff () {
    var pi0 = new google.maps.LatLng(0, 0);
    
    map = new google.maps.Map(document.getElementById('map_canvas'), {
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            center: pi0,
            zoom: default_zoom
        });
    infowindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();
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

// Sets the current status sliding down the right panel
function setStatus( type, status_str, function_name, complete_func )
{
	console.log( "setting status to: " + type + ": " + status_str + " in " + function_name )
	$("#map_working").slideUp( 'fast', function(){
		$("#map_success").slideUp( 'fast', function(){
			$("#map_error").slideUp( 'fast', function(){
				$("#map_" + type ).html( status_str ).slideDown( 'slow', function(){
					if( complete_func ) complete_func();
					} );
			});
		});
	});
}

// Attempts to center the map on an address
function centerOnAddress( address_txt, complete_func )
{
	setStatus( "working", "Digging around... ", "centerOnAddress", function(){
	    geocoder.geocode( { 'address': address_txt }, function(results, stat) {
	    	if (stat == google.maps.GeocoderStatus.OK) {
			
				var p = results[0];
				
				map.setCenter(p.geometry.location);
				myLocMarker = addAddressMarker( p, "I am here" );
				myLoc = p.geometry.location;
				
				if( map.getZoom() > default_zoom ) 
					map.setZoom( default_zoom );

				setStatus( "success", 'Found this address.', "centerOnAddress" );
				complete_func();
			} else {
				setStatus( "error", 'Sorry, nothing found.', "centerOnAddress"  );
			}
	    });	
	} );	
}

// Single_item means that we are looking for one item rather than a list
function searchFnc( complete_func, single_item ) {
	setStatus( "working", 'Looking, searching, digging...', "searchFnc", function(){
				
	    $("#searchResults").html("");

	    var sTxt = $("#where").val();
	    if (sTxt.length<0) {
	        $("#searchResults").html("Type at least 0 chars.>");
	        $("#searchResults").slideDown( 'slow');
	    } else {
			attemptFindViaPlace( sTxt );
	    }
		
	} );

}

function attemptFindViaPlace( sTxt, complete_func, error_func )
{
	var map_bounds = map.getBounds();
    var placeApi = new google.maps.places.PlacesService(map);
    var searchRequest = {
        name: sTxt,
        types: defaultTypes,
		bounds: map_bounds
		};
    placeApi.search(searchRequest, function( r, s ){
			if( !procPlaceSearchResponse( r, s ) )
				if( error_func ) error_func();
		});
}

function procPlaceSearchResponse( r, s ){
    placesList = [];
    cleanMarkerList();
    markersList = [];
    var pStore = "";
    var dBounds = new google.maps.LatLngBounds();
    if (s == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < r.length; i++) {
            var p = r[i];
			var placeLoc =  p.geometry.location;
            placesList.push(p);
            
            var pName = p.name;
            var pType  = p.types[0];
            var pid    = p.id;
            var pVicinity = p.vicinity;
            var address = pName + " " + pVicinity;
            var extAddress = pType +": "+ address;
			var title_str = pickMeStr( placeLoc.lat(), placeLoc.lng(), pName, pVicinity ) + "<a href='#"+address+"' class='address' onclick=\"showOnlyPlace('"+i+"');\">"+extAddress+"</a>";
            var info_box_str = p.types[0] + ": " +p.name + ", " + p.vicinity + "<br/>" + pickMeStr( placeLoc.lat(), placeLoc.lng(), p.name, p.vicinity );

			pStore += "<li>" + title_str + "</li>";
            
			createMarker( p, info_box_str );
			// dBounds.extend( placeLoc );
        }
        // map.fitBounds(dBounds);

		if( map.getZoom() > default_zoom ){
			map.setZoom( default_zoom );
		}
        $("#searchResults").html("<ul>"+pStore+"</ul>");


		$("#searchResults").slideDown( 'slow');	
		setStatus( "success", "Found some places.  Please select the one where you are at.", "procPlaceSearchResponse" );
    } else {
		find_location_via_address( $("#where").val(), ADD_MARKER );
    }
}

function handle_found_place( place )
{
    createMarker( place ); 	
}

function addAddressMarker(r_item) {

	var addr = r_item.formatted_address; 
	 
	var marker = new google.maps.Marker({
		map: map,
		position: r_item.geometry.location,
		zIndex: 1
	});

	markersList.push({marker:marker, place: r_item });
	google.maps.event.addListener(marker, 'click', function(marker) {
		infowindow.setContent( addr + "<br/>" + pickMeStr( this.getPosition().lat(), this.getPosition().lng(), "", addr ) );
		infowindow.open(map, this);
	});
	
	pStore = pickMeStr( marker.getPosition().lat(), marker.getPosition().lng(), "", addr ) + "<a href='#"+addr+"' onclick=\"showOnlyPlace('"+ (markersList.length-1) +"');\">"+addr+"</a>";

	// This is probably wrong.  Selector should be UL under #searchResults
	$( "#searchResults ul" ).append( $( "li" ).val( pStore) );

	return marker;
}

function find_location_via_address( address_txt, add_address_marker, found_item_func )
{
    geocoder.geocode( { 'address': address_txt }, function(results, stat) {
	    var dBounds = new google.maps.LatLngBounds();
    	if (stat == google.maps.GeocoderStatus.OK) {
			for(var j=0; j<results.length; j++) {
				if( add_address_marker )
					addAddressMarker( results[j], found_item_func );
				if( results.length > 0 )
					map.setCenter(results[0].geometry.location);
			}
			map.fitBounds(dBounds);
			if( map.getZoom() > default_zoom ){
				map.setZoom( default_zoom );
			}
			$("#searchResults").slideDown( 'slow');				
			setStatus( "success", 'Found this address.', "find_location_via_address" );
		} else {
			$("#searchResults").slideUp( 'fast');
			setStatus( "error", 'Sorry, nothing found.', "find_location_via_address" );
		}
    });	
}

function pickMeStr( lat, lng, name, addr )
{
	return " <div class='btn' onclick=\"setMyPositionTo(" + lat + "," + lng + ", '" + escape(name) + "', '" + escape(addr) + "')\">I am here</div>";
}


function createMarker(p, msg) {
    var placeLoc = p.geometry.location;
    var marker = new google.maps.Marker({
                    map: map,
                    position: placeLoc,
					zIndex: 1
                });
    markersList.push({marker: marker, place: p} );     
    google.maps.event.addListener(marker, 'click', 
            function() {
                infowindow.setContent( msg );
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
	setStatus( "working", 'Looking for you...', "findMeFnc", function(){
		clearMyLocMarker();
	    if (navigator &&
	            (ng = navigator.geolocation) &&
	            ng.getCurrentPosition) {
	        ng.getCurrentPosition( function( pos ){ 
									locFoundYou( pos, complete_func );
								   }, locNoFoundYou);
		} else {
			setStatus( "error", "<h3>Your browser does not support geolocation.  <button class='btn' name='findMeBtn'' id='findMeBtn' value='Find Me'>Try Again!</button></h3>", "findMeFnc" );
	    }
	});
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

function applyMyNewPosition()
{	
	for( var i in map_fields )
		copy_val( map_fields[i], "new_", "" );
		
}

function locFoundYou( pos, complete_func ) {
	console.log( "in logFound " + Math.random());
	$("#map_working").slideUp( 'fast', function(){
    	$("#map_working").html("Found your coordinates.").slideDown( "slow" );
	    var lat = pos.coords.latitude;
	    var lng = pos.coords.longitude;

		myLoc = new google.maps.LatLng(lat,lng);
		
	    map.setCenter(myLoc);
	    map.setZoom(default_zoom);

		addMyMarker( myLoc, "I am here!", complete_func );
	});
}

function findPlacesNear( loc )
{
	// Can we find a place based on this location?
	var map_bounds = map.getBounds();
    var placeApi = new google.maps.places.PlacesService(map);
    var searchRequest = {
        // location: loc,
        // radius: 50,
		bounds: map_bounds,
        types: defaultTypes
	};
    placeApi.search(searchRequest, function( r, s ){
		setStatus( "success", "Did I find you?", "findPlacesNear", function(){
			console.log( "findPlacesNear - loc " +  loc);
			console.log( "findPlacesNear - loc " +  defaultTypes );
			console.log( "findPlacesNear - found " +  r.length + " items");
			procPlaceSearchResponse( r, s );
		});
	});	
}

function addMyMarker( loc, msg, complete_func )
{
	
    myLocMarker = new google.maps.Marker({
		map: map,
		position: loc,
		animation: google.maps.Animation.DROP,
		icon: '/images/markers/blue_MarkerA.png',
		zIndex: -1
    });

    google.maps.event.addListener(myLocMarker, 'click',
            function() {
                infowindow.setContent( msg );
                infowindow.open(map, myLocMarker);
            });

    map.setCenter(myLoc);
    map.setZoom(default_zoom);

	// Need to call listener because that is when the bounds actually change
	listener_handle = google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
	 	if( typeof( complete_func ) != 'undefined' ){
			complete_func();
			//google.maps.event.removeListener(listener_handle);
		}			
	});
}
var listener_handle;

function locNoFoundYou( error ) { 
	$("#map_working").slideUp( 'fast', function(){
    	$("#map_error").html("Can't find you :( <button class='btn' name='findMeBtn'' id='findMeBtn' value='Find Me'>Find Me Again!</button> or type in your address below.").slideDown( "slow" );
	});
	
}
