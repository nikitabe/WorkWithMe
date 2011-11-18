function do_send( u, msg )
{
	$.ajax({
	  url: "/conversation",
	  type: "POST",
	  data: { 
		username: u,
		message: msg
		},
	  success: function( msg ){
		if( msg == "OK"){
			$("#out_str").html( "sent successfully" );
		}
		else{
	    		$("#out_str").html( msg );
		}
	  }
	});

}