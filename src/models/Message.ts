import { Model, model, models, Schema, Types } from "mongoose";

export type MessageDocument = {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  textContent: string;
  sentAt: Date;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    textContent: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, sentAt: -1 });

const Message = (models.Message as Model<MessageDocument>) || model<MessageDocument>("Message", messageSchema);

export default Message;
