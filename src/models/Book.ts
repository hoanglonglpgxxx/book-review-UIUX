import { Model, model, models, Schema } from "mongoose";

export type BookDocument = {
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  publishYear: number | null;
  isbn: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const bookSchema = new Schema<BookDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    author: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2_000_000,
    },
    publishYear: {
      type: Number,
      default: null,
      min: 0,
      max: 3000,
    },
    isbn: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 20,
    },
  },
  { timestamps: true },
);

bookSchema.index({ title: 1, author: 1 });
bookSchema.index({ isbn: 1 }, { unique: true, sparse: true });

const Book = (models.Book as Model<BookDocument>) || model<BookDocument>("Book", bookSchema);

export default Book;
