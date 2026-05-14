import { Model, models, model, Schema, Types } from "mongoose";

export type TodoDocument = {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  dueAt?: Date | null;
  completed: boolean;
  emailSent: boolean;
  completionToken: string;
  createdAt: Date;
  updatedAt: Date;
};

const todoSchema = new Schema<TodoDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 200, trim: true },
    description: { type: String, maxlength: 1000, trim: true },
    dueAt: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    completionToken: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const Todo = (models.Todo as Model<TodoDocument>) || model<TodoDocument>("Todo", todoSchema);

export default Todo;