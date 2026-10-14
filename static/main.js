function start_game() {
    // 6-character er unique random room id toiri korlam
    const roomId = 'room_' + Math.random().toString(36).substring(2, 8);
    window.location.href = "/room/" + roomId;
}

function join_custom_room() {
    const input = document.getElementById("room_input");
    if (input && input.value.trim()) {
        window.location.href = "/room/" + input.value.trim();
    } else {
        alert("Room Code likhe Join koro!");
    }
}
