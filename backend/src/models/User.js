// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
