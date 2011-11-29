
function adjust_date( elem )
{
	// console.log( "Before --- " + $(elem).html() + " GMT" );
	var d = new Date( $(elem).html() + " GMT" );
	$(elem).html( d.toString( "ddd h:mm tt" ) );
	$(elem).removeClass( "adjust_date" );
	// console.log( "After --- " + $(elem).html() );
}

function adjust_dates()
{	
	$.each( $('.adjust_date'), function(){
		adjust_date( this );
	});
}
$(function () {
	console.log( "Running intro");
	adjust_dates();
});