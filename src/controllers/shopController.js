const shopService = require("../services/shopService");

async function getProfile(req, res) {
  try {
    const profile = await shopService.getProfile();
    if (!profile) {
      return res.json(null);
    }

    return res.json(profile);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function getProfileName(req, res) {
  try {
    const profile = await shopService.getProfileName();
    if (!profile) {
      return res.json(null);
    }

    return res.json(profile);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function addProfile(req, res) {
  try {
    const response = await shopService.saveProfile(req.body);
    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getProfile,
  getProfileName,
  addProfile,
};
