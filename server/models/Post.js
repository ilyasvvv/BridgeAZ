const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      alias: "authorId"
    },
    content: { type: String, required: true },
    attachmentUrl: String,
    attachmentContentType: String,
    attachmentKind: { type: String, enum: ["image", "pdf", "file"] },
    visibilityRegion: {
      type: String,
      trim: true,
      default: "ALL"
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
  justOne: false
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Post", postSchema);
