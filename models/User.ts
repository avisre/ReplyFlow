import { type InferSchemaType, model, models, Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
    },
    googleAccessToken: {
      type: String,
      default: null,
    },
    googleRefreshToken: {
      type: String,
      default: null,
    },
    autoPostReplies: {
      type: Boolean,
      default: false,
    },
    newReviewAlertsEnabled: {
      type: Boolean,
      default: true,
    },
    alertEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trialing"],
      default: "inactive",
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

export type UserSchemaType = InferSchemaType<typeof UserSchema>;

const User = models.User || model("User", UserSchema);

export default User;
