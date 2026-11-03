function start_game() {
    // Server creates the private room and issues the Player 1 invite token.
    window.location.href = "/player1";
}

function join_custom_room() {
    const input = document.getElementById("room_input");
    const value = input ? input.value.trim() : "";
    if (value && value.includes("?token=")) {
        // Only private invite links carry a valid player token.
        window.location.href = value;
    } else if (value) {
        alert("Room code alone is not enough. Player 1-er private invite link use koro.");
    } else {
        alert("Player 1-er private invite link paste koro!");
    }
}
