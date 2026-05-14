import { Model, models, model, Schema, Types } from "mongoose";

export const reviewStatuses = [
  "want_to_read",
  "not_started",
  "reading",
  "waiting_to_review",
  "dropped",
] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];
export const readingTypes = ["kindle", "paper"] as const;
export type ReadingType = (typeof readingTypes)[number];

export type ReviewDocument = {
  userId: Types.ObjectId;
  bookId: Types.ObjectId;
  rating: number;
  status: ReviewStatus;
  startDate: Date | null;
  endDate: Date | null;
  readingType: ReadingType;
  pageCount: number | null;
  currentPage: number | null;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
};

const reviewSchema = new Schema<ReviewDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: reviewStatuses,
      default: "waiting_to_review",
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    readingType: {
      type: String,
      enum: readingTypes,
      default: "paper",
      required: true,
    },
    pageCount: {
      type: Number,
      default: null,
      min: 1,
    },
    currentPage: {
      type: Number,
      default: null,
      min: 0,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ userId: 1, bookId: 1, createdAt: -1 });

const Review =
  (models.Review as Model<ReviewDocument>) || model<ReviewDocument>("Review", reviewSchema);

export default Review;
