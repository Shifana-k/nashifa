// Grabbing elements
// const container = document.getElementById('container-signup');
// const registerBtn = document.getElementById('register');
// const loginBtn = document.getElementById('login');

// // Toggle to signup form
// registerBtn.addEventListener('click', () => {
//     container.classList.add("active"); // Activate sign-up view
// });

// // Toggle to login form
// loginBtn.addEventListener('click', () => {
//     container.classList.remove("active"); // Activate sign-in view
// });


let countdown = 60; // Timer duration in seconds
const timerElement = document.getElementById("timer");
const resendButton = document.getElementById("resendOtpButton"); // Declare the resend button

const startCountdown = () => {
    const timer = setInterval(() => {
        if (countdown > 0) {
            timerElement.textContent = `Time remaining: ${countdown--} seconds`;
        } else {
            clearInterval(timer);
            timerElement.textContent = "OTP expired. Please request a new OTP.";
            resendButton.disabled = false; // Enable the resend button
        }
    }, 1000);
};

window.onload = startCountdown; // Start timer when the page loads

resendButton.addEventListener("click", () => {
    resendButton.disabled = true; // Disable button to prevent multiple clicks

    fetch('/resend-otp', { method: 'POST' }) // Make sure the backend route is POST
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert(data.message || 'OTP resent successfully!');
                countdown = 60; // Reset countdown
                resendButton.disabled = true; // Disable the button again
                startCountdown(); // Restart the countdown
            } else {
                alert(data.message || 'Failed to resend OTP. Please try again.');
            }
        })
        .catch((error) => {
            console.error("Error during OTP resend:", error.message);
            alert('Failed to resend OTP. Please try again.');
        });
});
