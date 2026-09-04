import moongose from "mongoose";

const campusSchema = new moongose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    location: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const modelName = "Campus";

const Campus = moongose.model(modelName, campusSchema);

export default Campus;