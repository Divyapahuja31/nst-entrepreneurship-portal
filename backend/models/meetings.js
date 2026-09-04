import moongoose from 'mongoose';

const meetingsSchema = new moongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    organiser: {
      type: moongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: moongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    scheduledAt: {
      type: Date,
      required: true,
    },
    meetingDuration: {
      type: Number, 
      required: true,
    },
    meet_url: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true, 
    },
  },
  {
    timestamps: true,
  }
);

export const modelName = "Meeting";

const Meeting = moongoose.model(modelName, meetingsSchema);

export default Meeting;