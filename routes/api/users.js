const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const normalize = require("normalize-url");
const config = require("../../config/default.json");
const User = require("../../models/User");

/**
 * @route  POST    api/users
 * @desc   register user
 * @access Public
 */

router.post(
  "/",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    try {
      //see if user exsist with the same email

      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          errors: [
            {
              msg: "User already exists",
            },
          ],
        });
      }

      //Get users gravatar - if you send email this method gives the gravatar url.

      const avatar = normalize(
        gravatar.url(email, {
          s: "200",
          r: "pg",
          d: "mm",
        }),
        { forceHttps: true }
      );

      //Encrypt password

      user = new User({
        name,
        email,
        avatar,
        password,
      });

      /**
       * @param {Function}  bcrypt.genSalt - takes a param as number that will create a cycle. 10 is recommended inorder to get secure password.
       *  @returns {Promise} salt.
       * @param {Function}  bcrypt.hash - takes 2 args which are plain pwd and salt.
       * @returns {Promise} hashed password.
       */

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      //Return jsonwebtoken after registration

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(payload, config.get("jwtSignInSecret"));
    } catch (err) {
      console.error(err.message);
      return res.status(500).send("Server error");
    }
  }
);

module.exports = router;
