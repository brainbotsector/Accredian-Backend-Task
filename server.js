const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const referralRoutes = require('./routes/referralRoutes');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Ensure URL-encoded bodies are parsed
app.use('/api/referrals', referralRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
