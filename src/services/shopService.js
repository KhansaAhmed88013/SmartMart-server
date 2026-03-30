const { ShopProfile } = require("../../db");

async function getProfile() {
  const profile = await ShopProfile.findOne();
  if (!profile) {
    return null;
  }

  return {
    shopName: profile.shop_name,
    number1: profile.number1,
    number2: profile.number2,
    location: profile.location,
    description: profile.description,
  };
}

async function getProfileName() {
  const profile = await ShopProfile.findOne();
  if (!profile) {
    return null;
  }

  return { shopName: profile.shop_name };
}

async function saveProfile(payload) {
  const { shopName, number1, number2, location, description } = payload;
  let profile = await ShopProfile.findOne();

  if (profile) {
    profile.shop_name = shopName;
    profile.number1 = number1;
    profile.number2 = number2;
    profile.location = location;
    profile.description = description;
    await profile.save();
  } else {
    profile = await ShopProfile.create({
      shop_name: shopName,
      number1,
      number2,
      location,
      description,
    });
  }

  return { success: true, message: "Shop profile saved successfully" };
}

module.exports = {
  getProfile,
  getProfileName,
  saveProfile,
};
