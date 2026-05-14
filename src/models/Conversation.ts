import { Model, model, models, Schema } from "mongoose";

export const conversationTypes = ["private", "group"] as const;
export type ConversationType = (typeof conversationTypes)[number];

export type ConversationDocument = {
  type: ConversationType;
  createdAt: Date;
  updatedAt: Date;
};

const conversationSchema = new Schema<ConversationDocument>(
  {
    type: {
      type: String,
      enum: conversationTypes,
      required: true,
      default: "group",
    },
  },
  { timestamps: true },
);

conversationSchema.index({ type: 1, createdAt: 1 });

const Conversation =
  (models.Conversation as Model<ConversationDocument>) ||
  model<ConversationDocument>("Conversation", conversationSchema);

export default Conversation;
