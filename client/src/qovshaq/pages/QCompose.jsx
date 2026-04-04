// Qovshaq Phase 1C — Create post flow
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../utils/auth";
import { qApi } from "../utils/qApi";
import { categories, templateFieldLabels, templateFieldOptions } from "../utils/categories";
import { uploadViaPresign } from "../../api/client";
import QLocationPicker from "../components/QLocationPicker";
import QButton from "../components/QButton";
import QCard from "../components/QCard";
import QInput from "../components/QInput";
import QBadge from "../components/QBadge";

export default function QCompose() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");
  const [templateData, setTemplateData] = useState({});
  const [location, setLocation] = useState(
    user?.qLocation || { country: "", countryCode: "", city: "", region: "" }
  );
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const selectedCat = categories.find((c) => c.id === category);
  const templateFields = selectedCat?.templateFields || [];

  const handleTemplateChange = (field, value) => {
    setTemplateData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadViaPresign({ file, purpose: "qpost" }, token);
        const kind = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : file.type === "application/pdf"
          ? "pdf"
          : "file";
        setAttachments((prev) => [
          ...prev,
          { url: result.publicUrl || result.fileUrl, contentType: file.type, kind },
        ]);
      }
    } catch {
      setError("File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      setError("Please write something before posting");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      await qApi.createPost(
        {
          category,
          content: content.trim(),
          templateData,
          location,
          tags,
          attachments,
        },
        token
      );
      navigate("/q", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create post");
      setPublishing(false);
    }
  };

  return (
    <div className="-mt-2">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-q-display text-2xl text-q-text">Create Post</h1>
        <QButton variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </QButton>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap border transition-all ${
              category === cat.id
                ? "border-q-primary bg-q-primary-light text-q-primary font-medium shadow-sm"
                : "border-q-border bg-q-surface text-q-text-muted hover:border-q-text-muted/40"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </motion.button>
        ))}
      </div>

      <QCard className="p-5 space-y-4">
        {/* Main content */}
        <QInput
          multiline
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            selectedCat?.id === "event"
              ? "Tell people about your event..."
              : selectedCat?.id === "opportunity"
              ? "Describe the opportunity..."
              : selectedCat?.id === "request"
              ? "What do you need help with?"
              : "What's on your mind?"
          }
        />

        {/* Template fields */}
        <AnimatePresence>
          {templateFields.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="text-xs font-medium text-q-text-muted uppercase tracking-wide">
                {selectedCat.label} Details
              </div>
              {templateFields.map((field) => {
                const options = templateFieldOptions[field];
                if (field === "eventDate") {
                  return (
                    <QInput
                      key={field}
                      type="datetime-local"
                      label={templateFieldLabels[field]}
                      value={templateData[field] || ""}
                      onChange={(e) => handleTemplateChange(field, e.target.value)}
                    />
                  );
                }
                if (options) {
                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-q-text mb-1.5">
                        {templateFieldLabels[field]}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleTemplateChange(field, opt)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                              templateData[field] === opt
                                ? "border-q-primary bg-q-primary-light text-q-primary"
                                : "border-q-border text-q-text-muted hover:border-q-text-muted/40"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <QInput
                    key={field}
                    label={templateFieldLabels[field]}
                    value={templateData[field] || ""}
                    onChange={(e) => handleTemplateChange(field, e.target.value)}
                    placeholder={`Enter ${templateFieldLabels[field].toLowerCase()}`}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location */}
        <QLocationPicker
          label="Location"
          value={location}
          onChange={setLocation}
        />

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-q-text mb-1.5">
            Tags <span className="text-q-text-muted font-normal">(up to 5)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <QBadge key={tag} color="q-primary" onClick={() => removeTag(tag)}>
                #{tag} ×
              </QBadge>
            ))}
          </div>
          {tags.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 bg-q-surface-alt rounded-lg text-sm text-q-text placeholder:text-q-text-muted/50 outline-none"
              />
              <QButton variant="outline" size="sm" onClick={addTag}>
                Add
              </QButton>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-q-text mb-1.5">Attachments</label>
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {attachments.map((att, i) => (
                <div key={i} className="relative group">
                  {att.kind === "image" ? (
                    <img src={att.url} alt="" className="h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-q-surface-alt flex items-center justify-center text-xs text-q-text-muted">
                      {att.kind}
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-q-danger text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-q-border rounded-lg text-sm text-q-text-muted cursor-pointer hover:border-q-text-muted/40 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
            {uploading ? "Uploading..." : "Add file"}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,video/*,.pdf"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-q-danger">{error}</p>
        )}
      </QCard>

      {/* Publish */}
      <div className="mt-5 flex justify-end">
        <QButton onClick={handlePublish} disabled={publishing || !content.trim()} size="lg">
          {publishing ? "Publishing..." : "Publish"}
        </QButton>
      </div>
    </div>
  );
}
