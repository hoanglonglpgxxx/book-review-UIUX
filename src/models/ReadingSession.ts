import { Model, model, models, Schema, Types } from "mongoose";

export type ReadingSessionDocument = {
  userId: Types.ObjectId;
  bookId: Types.ObjectId;
  reviewId: Types.ObjectId;
  startedAt: Date;
  endedAt: Date | null;
  startPage: number | null;
  endPage: number | null;
  pagesRead: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const readingSessionSchema = new Schema<ReadingSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    startPage: { type: Number, default: null, min: 0 },
    endPage: { type: Number, default: null, min: 0 },
    pagesRead: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

readingSessionSchema.index({ userId: 1, startedAt: -1 });
readingSessionSchema.index({ userId: 1, endedAt: -1 });

const ReadingSession =
  (models.ReadingSession as Model<ReadingSessionDocument>) ||
  model<ReadingSessionDocument>("ReadingSession", readingSessionSchema);

export default ReadingSession;
