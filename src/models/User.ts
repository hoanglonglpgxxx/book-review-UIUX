import { Model, models, model, Schema } from "mongoose";

export type ReadingGoal = {
  year: number;
  target: number;
};

export type UserDocument = {
  email: string;
  username: string;
  passwordHash: string;
  readingGoal: ReadingGoal | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    readingGoal: {
      type: new Schema({ year: Number, target: Number }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true },
);

const User = (models.User as Model<UserDocument>) || model<UserDocument>("User", userSchema);

export default User;
