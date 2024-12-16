document.getElementById('signInForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission and page refresh

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    let isValid = true;

    // Clear previous error messages
    document.getElementById('emailError').textContent = '';
    document.getElementById('passwordError').textContent = '';

    // Client-side validation
    if (!email || !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
        document.getElementById('emailError').textContent = 'Please enter a valid email address.';
        isValid = false;
    }

    if (!password || password.length < 6) {
        document.getElementById('passwordError').textContent = 'Password must be at least 6 characters long.';
        isValid = false;
    }

    // If validation passes, send the request to the backend
    if (isValid) {
        fetch('/sign-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // On success, clear error messages and show success
                document.getElementById('emailError').textContent = '';
                document.getElementById('passwordError').textContent = '';
                setTimeout(() => {
                    window.location.href = data.redirect || '/'; // Redirect after success (if any)
                }, 1000); // Optional: Wait for 1 second before redirecting
            } else {
                // Handle server-side errors, display them under the respective fields
                if (data.message.includes("email")) {
                    document.getElementById('emailError').textContent = data.message || 'Invalid email address';
                } else if (data.message.includes("password")) {
                    document.getElementById('passwordError').textContent = data.message || 'Invalid password';
                } else {
                    document.getElementById('emailError').textContent = '';
                    document.getElementById('passwordError').textContent = data.message || 'Login failed. Please try again.';
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('emailError').textContent = 'An error occurred. Please try again later.';
            document.getElementById('passwordError').textContent = '';
        });
    }
});