
const API_URL = window.location.origin;

function showForm(type) {
    document.getElementById("signinForm").classList.toggle("hidden", type !== "signin");
    document.getElementById("signupForm").classList.toggle("hidden", type !== "signup");

    document.getElementById("signinTab").classList.toggle("active", type === "signin");
    document.getElementById("signupTab").classList.toggle("active", type === "signup");

    document.getElementById("message").textContent = "";
}

function showMessage(message, success = false) {
    const element = document.getElementById("message");
    element.textContent = message;
    element.style.color = success ? "green" : "red";
}

document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        showMessage("Passwords do not match");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                name: document.getElementById("name").value,
                email: document.getElementById("email").value,
                phone: document.getElementById("phone").value || null,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Registration failed");
        }

        showMessage("Account created successfully! Please sign in.", true);
        event.target.reset();
        showForm("signin");

    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById("signinForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                email: document.getElementById("loginEmail").value,
                password: document.getElementById("loginPassword").value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Login failed");
        }

        sessionStorage.setItem("access_token", data.access_token);

        const profileResponse = await fetch(`${API_URL}/auth/me`, {
            headers: {
                "Authorization": `Bearer ${data.access_token}`
            }
        });

        if (!profileResponse.ok) {
            throw new Error("Unable to retrieve user profile");
        }

        const user = await profileResponse.json();

        showMessage(`Welcome, ${user.name}! Login successful.`, true);
        document.getElementById("signinForm").reset();
        document.getElementById("logoutBtn").classList.remove("hidden");

    } catch (error) {
        sessionStorage.removeItem("access_token");
        showMessage(error.message);
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("access_token");
    document.getElementById("logoutBtn").classList.add("hidden");
    showMessage("Logged out successfully.", true);
    showForm("signin");
});
