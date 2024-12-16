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


const timerElement = document.getElementById("timer");
const resendButton = document.getElementById("resendOtpButton");

// Timer duration in seconds
const TIMER_DURATION = 60;

// Initialize or retrieve the end time from localStorage
const initializeTimer = () => {
    const savedEndTime = localStorage.getItem("otpTimerEndTime");
    let endTime;

    if (savedEndTime && Date.now() < savedEndTime) {
        endTime = parseInt(savedEndTime, 10); // Use existing end time
    } else {
        endTime = Date.now() + TIMER_DURATION * 1000; // Set a new end time
        localStorage.setItem("otpTimerEndTime", endTime);
    }

    startCountdown(endTime);
};

// Start the countdown based on the end time
const startCountdown = (endTime) => {
    const timer = setInterval(() => {
        const remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

        if (remainingTime > 0) {
            timerElement.textContent = `Resend OTP in: ${remainingTime} seconds`;
            resendButton.disabled = true; // Keep the button disabled
        } else {
            clearInterval(timer);
            timerElement.textContent = "You can now resend the OTP.";
            resendButton.disabled = false; // Enable the button
            localStorage.removeItem("otpTimerEndTime"); // Clear the timer data
        }
    }, 1000);
};

// Resend OTP button logic
resendButton.addEventListener("click", () => {
    resendButton.disabled = true; // Disable button to prevent multiple clicks

    fetch('/resend-otp', { method: 'POST' })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert(data.message || 'OTP resent successfully!');
                const newEndTime = Date.now() + TIMER_DURATION * 1000;
                localStorage.setItem("otpTimerEndTime", newEndTime); // Update timer
                startCountdown(newEndTime); // Restart the countdown
            } else {
                alert(data.message || 'Failed to resend OTP. Please try again.');
            }
        })
        .catch((error) => {
            console.error("Error during OTP resend:", error.message);
            alert('Failed to resend OTP. Please try again.');
        });
});

// Initialize the timer when the page loads
window.onload = initializeTimer;


//logout
// function confirmLogout() {
    
//     var isConfirmed = confirm("Are you sure you want to log out?");
    
//     // If the user confirmed, redirect to the logout route
//     if (isConfirmed) {
//         window.location.href = "/logout"; 
//     }
// }

function confirmLogout() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Logout'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "/logout";
        }
    });
}

