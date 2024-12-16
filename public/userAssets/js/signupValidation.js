document.getElementById('signupForm').addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission
    let isValid = true;

    // Clear previous error messages
    document.querySelectorAll('.error-message').forEach((el) => (el.textContent = ''));

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const cpassword = document.getElementById('cpassword').value;
    const mobile = document.getElementById('mobile').value.trim();

    // Validate Name
    if (!name || name.length < 3 || /[^a-zA-Z\s]/.test(name)) {
        document.getElementById('nameError').textContent = 'Name must be at least 3 characters and contain only letters.';
        isValid = false;
    }

    // Validate Email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !email.endsWith('@gmail.com')) {
        document.getElementById('emailError').textContent = 'Please enter a valid Gmail address.';
        isValid = false;
    }

    // Validate Password
    if (password.length < 6) {
        document.getElementById('passwordError').textContent = 'Password must be at least 6 characters long.';
        isValid = false;
    }

    // Confirm Password
    if (password !== cpassword) {
        document.getElementById('cpasswordError').textContent = 'Passwords do not match.';
        isValid = false;
    }

    // Validate Mobile
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        document.getElementById('mobileError').textContent = 'Please enter a valid mobile number.';
        isValid = false;
    }

    if (isValid) {
        // Submit the form using AJAX if valid
        fetch('/sign-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, cpassword, mobile }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                // Use window.location.href for a full page redirect
                window.location.href = '/verify-otp';
            } else {
                document.getElementById('formError').textContent = data.message || 'An error occurred.';
            }
        })
        .catch((error) => {
            console.error(error);
            document.getElementById('formError').textContent = 'An error occurred. Please try again later.';
        });
    }
})