import { type InferSchemaType, model, models, Schema } from "mongoose";

const ReviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewId: {
      type: String,
      required: true,
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
    },
    locationId: {
      type: String,
      default: null,
      index: true,
    },
    locationName: {
      type: String,
      default: "Primary Location",
      trim: true,
    },
    generatedReply: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "generated", "posted"],
      default: "pending",
      index: true,
    },
    postedAt: {
      type: Date,
      default: null,
    },
    alertSentAt: {
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

ReviewSchema.index({ userId: 1, reviewId: 1 }, { unique: true });

export type ReviewSchemaType = InferSchemaType<typeof ReviewSchema>;

const Review = models.Review || model("Review", ReviewSchema);

export default Review;
