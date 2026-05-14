import { Model, model, models, Schema, Types } from "mongoose";

export type ParticipantDocument = {
  conversationId: Types.ObjectId;
  userId: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const participantSchema = new Schema<ParticipantDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
);

participantSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
participantSchema.index({ userId: 1, joinedAt: -1 });

const Participant =
  (models.Participant as Model<ParticipantDocument>) ||
  model<ParticipantDocument>("Participant", participantSchema);

export default Participant;
