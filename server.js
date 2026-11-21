const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3005;

const usersFile = path.join(__dirname, "users.json");

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "https://janani1-A.github.io");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});
app.use(express.static(__dirname));

if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, "[]");
}

app.get("/api/status", (req, res) => {
    res.json({ message: "Backend connected successfully!" });
});

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Please fill in all fields."
            });
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, "utf8")
        );

        const cleanEmail = email.trim().toLowerCase();

        if (users.some(user => user.email === cleanEmail)) {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        users.push({
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            role
        });

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        res.status(201).json({
            message: "Account created successfully!"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error."
        });
    }
});

// LOGIN API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password."
            });
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, "utf8")
        );

        const cleanEmail = email.trim().toLowerCase();
        const user = users.find(u => u.email === cleanEmail);

        if (!user) {
            return res.status(401).json({
                message: "Email or password is incorrect."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Email or password is incorrect."
            });
        }

        res.json({
            message: "Login successful!",
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error."
        });
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Smart Campus Server running at http://localhost:${PORT}`);
});