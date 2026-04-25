import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Calendar, Clock, MapPin, X, Edit, Trash2, User, Users, RefreshCw } from "lucide-react";
import { db, type Meeting } from "../../utils/database";
import { supabase, MEETINGS_CHANNEL, SPEAKER_CHANNEL } from "../../utils/supabaseClient";

interface MeetingProcess extends Meeting {
  attendees?: string[];
}

export function MeetingProcesses() {
  const [meetings, setMeetings] = useState<MeetingProcess[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const [featuredSpeaker, setFeaturedSpeaker] = useState({
    name: "",
    company: "",
    bio: "",
  });

  useEffect(() => {
    loadEventSettings();
    loadMeetings();

    const meetingsChannel = supabase
      .channel(MEETINGS_CHANNEL)
      .on('broadcast', { event: 'meetings-update' }, () => {
        loadMeetings();
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => loadMeetings()
      )
      .subscribe();

    const speakerChannel = supabase
      .channel(SPEAKER_CHANNEL)
      .on('broadcast', { event: 'speaker-update' }, (payload) => {
        if (payload.payload) {
          setFeaturedSpeaker(payload.payload);
        } else {
          loadEventSettings();
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_settings' },
        () => loadEventSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(speakerChannel);
    };
  }, []);

  const loadEventSettings = async () => {
    try {
      const settings = await db.getEventSettings();
      setFeaturedSpeaker({
        name: settings.featured_speaker_name,
        company: settings.featured_speaker_company,
        bio: settings.featured_speaker_bio,
      });
    } catch (err) {
      console.error("Failed to load event settings:", err);
    }
  };

  const loadMeetings = async () => {
    try {
      const meetingsData = await db.getMeetings();
      setMeetings(meetingsData);
    } catch (err) {
      console.error("Failed to load meetings:", err);
    }
    setLoading(false);
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.startTime) return;

    try {
      let updatedMeetings: MeetingProcess[];
      
      if (editingMeetingId) {
        const updated = await db.updateMeeting(editingMeetingId, {
          title: newMeeting.title,
          start_time: newMeeting.startTime,
          end_time: newMeeting.endTime || null,
          description: newMeeting.description || null,
          location: newMeeting.location || null,
        });
        updatedMeetings = meetings.map(m => m.id === editingMeetingId ? updated : m);
      } else {
        const meeting = await db.addMeeting(
          newMeeting.title,
          newMeeting.startTime,
          newMeeting.endTime,
          newMeeting.description,
          newMeeting.location
        );
        updatedMeetings = [...meetings, meeting];
      }
      
      setMeetings(updatedMeetings);
      
      const channel = supabase.channel(MEETINGS_CHANNEL);
      await channel.send({
        type: 'broadcast',
        event: 'meetings-update',
        payload: updatedMeetings,
      });
    } catch (err) {
      console.error("Failed to save meeting:", err);
    }

    setShowCreateModal(false);
    setEditingMeetingId(null);
    setNewMeeting({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
    });
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      await db.deleteMeeting(id);
      const updatedMeetings = meetings.filter(m => m.id !== id);
      setMeetings(updatedMeetings);
      
      const channel = supabase.channel(MEETINGS_CHANNEL);
      await channel.send({
        type: 'broadcast',
        event: 'meetings-update',
        payload: updatedMeetings,
      });
    } catch (err) {
      console.error("Failed to delete meeting:", err);
    }
  };

  const getMeetingStatus = (startTime: string | undefined, endTime: string | null | undefined): "completed" | "in-progress" | "upcoming" => {
    if (!startTime) return "upcoming";
    
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    const [startHour, startMin] = startTime.split(":").map(Number);
    const startDate = new Date(today);
    startDate.setHours(startHour, startMin, 0, 0);
    
    let endDate = null;
    if (endTime) {
      const [endHour, endMin] = endTime.split(":").map(Number);
      endDate = new Date(today);
      endDate.setHours(endHour, endMin, 0, 0);
    }
    
    if (now < startDate) {
      return "upcoming";
    } else if (endDate && now > endDate) {
      return "completed";
    } else {
      return "in-progress";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-primary/10 text-primary";
      case "completed":
        return "bg-[#10b981]/10 text-[#10b981]";
      default:
        return "bg-muted/30 text-muted-foreground";
    }
  };

  const getDisplayStatus = (startTime: string | undefined, endTime: string | null | undefined) => {
    return getMeetingStatus(startTime, endTime);
  };

  const defaultMeetings: MeetingProcess[] = [
    {
      id: "1",
      title: "Opening Keynote",
      description: "Welcome address and opening remarks by the CIO",
      startTime: "09:00",
      endTime: "10:00",
      location: "Main Hall",
      attendees: [],
      status: "completed",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "AI Strategy Panel",
      description: "Discussion on AI implementation in enterprise",
      startTime: "10:30",
      endTime: "11:30",
      location: "Conference Room A",
      attendees: [],
      status: "in-progress",
      created_at: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Networking Lunch",
      description: "Meet and connect with fellow attendees",
      startTime: "12:00",
      endTime: "13:30",
      location: "Dining Hall",
      attendees: [],
      status: "upcoming",
      created_at: new Date().toISOString(),
    },
  ];

  const displayMeetings = meetings.length > 0 ? meetings : defaultMeetings;

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h2 className="mb-1 text-lg sm:text-xl" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Meeting Processes
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base" style={{ fontSize: "0.9375rem" }}>
            Schedule and manage event sessions
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setShowSpeakerModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
            style={{ fontSize: "0.875rem sm:text-0.9375rem", fontWeight: 500 }}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Speaker</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg shadow-primary/20"
            style={{ fontSize: "0.875rem sm:text-0.9375rem", fontWeight: 500 }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add Session</span>
            <Plus className="w-4 h-4 sm:hidden" />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="mb-4 flex items-center gap-2 text-base sm:text-lg" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Featured Speaker
        </h2>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground mb-1" style={{ fontSize: "0.875rem" }}>
                Featured Speaker
              </p>
              <p style={{ fontSize: "1.125rem sm:text-1.25rem", fontWeight: 600 }} className="mb-1">
                {featuredSpeaker?.name || "Dr. Sarah Mitchell"}
              </p>
              <p className="text-muted-foreground mb-3" style={{ fontSize: "0.875rem sm:text-0.9375rem" }}>
                {featuredSpeaker?.company || "CIO, GlobalTech Industries"}
              </p>
              <p className="text-foreground/80" style={{ fontSize: "0.875rem sm:text-0.9375rem", lineHeight: 1.6 }}>
                "{featuredSpeaker?.bio || "Transforming Enterprise Technology"}"
              </p>
            </div>
            <button
              onClick={() => setShowSpeakerModal(true)}
              className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors flex-shrink-0"
              title="Edit Speaker"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <h2 className="mb-4 flex items-center gap-2 text-base sm:text-lg" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        Sessions
      </h2>

      <div className="space-y-3 sm:space-y-4">
        {displayMeetings.map((meeting, index) => (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 sm:p-5 bg-secondary/30 border border-border rounded-2xl"
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span
                    className={`px-2 py-0.5 rounded-md ${getStatusColor(getDisplayStatus(meeting.start_time, meeting.end_time || null))}`}
                    style={{ fontSize: "0.75rem", fontWeight: 500 }}
                  >
                    {(() => {
                      const s = getDisplayStatus(meeting.start_time, meeting.end_time || null);
                      return s === "in-progress" ? "In Progress" : s === "completed" ? "Completed" : "Upcoming";
                    })()}
                  </span>
                </div>
                <p className="mb-2 sm:mb-3" style={{ fontSize: "1rem", fontWeight: 500 }}>
                  {meeting.title}
                </p>
                <p className="text-muted-foreground mb-2 sm:mb-3" style={{ fontSize: "0.9375rem" }}>
                  {meeting.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-muted-foreground text-xs sm:text-sm" style={{ fontSize: "0.875rem" }}>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {meeting.start_time} {meeting.end_time ? `- ${meeting.end_time}` : ""}
                  </span>
                  <span className="w-1 h-1 bg-muted-foreground rounded-full hidden sm:inline" />
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                    {meeting.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setNewMeeting({
                      title: meeting.title,
                      description: meeting.description || "",
                      startTime: meeting.start_time,
                      endTime: meeting.end_time || "",
                      location: meeting.location || "",
                    });
                    setEditingMeetingId(meeting.id);
                    setShowCreateModal(true);
                  }}
                  className="p-2 sm:p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => handleDeleteMeeting(meeting.id)}
                  className="p-2 sm:p-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {displayMeetings.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4" style={{ fontSize: "1rem" }}>
            No sessions scheduled yet
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all"
            style={{ fontSize: "0.9375rem", fontWeight: 500 }}
          >
            <Plus className="w-5 h-5" />
            Add Your First Session
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCreateModal(false);
                setEditingMeetingId(null);
                setNewMeeting({
                  title: "",
                  description: "",
                  startTime: "",
                  endTime: "",
                  location: "",
                });
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl z-50 shadow-2xl"
            >
              <div className="sticky top-0 px-6 py-4 border-b border-border bg-secondary/30 backdrop-blur-xl flex items-center justify-between">
                <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingMeetingId ? "Edit Session" : "Add New Session"}</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="Enter session title..."
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Description
                  </label>
                  <textarea
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    placeholder="Enter description..."
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newMeeting.startTime}
                      onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newMeeting.endTime}
                      onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                    placeholder="e.g., Main Hall, Conference Room A"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingMeetingId(null);
                      setNewMeeting({
                        title: "",
                        description: "",
                        startTime: "",
                        endTime: "",
                        location: "",
                      });
                    }}
                    className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMeeting}
                    disabled={!newMeeting.title.trim() || !newMeeting.startTime}
                    className={`flex-1 py-3 rounded-xl transition-all ${
                      newMeeting.title.trim() && newMeeting.startTime
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                    }`}
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    {editingMeetingId ? "Update Session" : "Add Session"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSpeakerModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSpeakerModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl z-50 shadow-2xl"
            >
              <div className="sticky top-0 px-6 py-4 border-b border-border bg-secondary/30 backdrop-blur-xl flex items-center justify-between">
                <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Featured Speaker</h3>
                <button
                  onClick={() => setShowSpeakerModal(false)}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Speaker Name
                  </label>
                  <input
                    type="text"
                    value={featuredSpeaker.name}
                    onChange={(e) => setFeaturedSpeaker({ ...featuredSpeaker, name: e.target.value })}
                    placeholder="Enter speaker name..."
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Company / Title
                  </label>
                  <input
                    type="text"
                    value={featuredSpeaker.company}
                    onChange={(e) => setFeaturedSpeaker({ ...featuredSpeaker, company: e.target.value })}
                    placeholder="e.g., CIO, TechCorp Inc."
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Bio / Topic
                  </label>
                  <textarea
                    value={featuredSpeaker.bio}
                    onChange={(e) => setFeaturedSpeaker({ ...featuredSpeaker, bio: e.target.value })}
                    placeholder="Enter speaker bio or topic description..."
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSpeakerModal(false)}
                    className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await db.updateEventSettings({
                          featured_speaker_name: featuredSpeaker.name,
                          featured_speaker_company: featuredSpeaker.company,
                          featured_speaker_bio: featuredSpeaker.bio,
                        });
                        
                        setShowSpeakerModal(false);
                        
                        const channel = supabase.channel(SPEAKER_CHANNEL);
                        await channel.send({
                          type: 'broadcast',
                          event: 'speaker-update',
                          payload: featuredSpeaker,
                        });
                      } catch (err) {
                        console.error("Failed to save speaker:", err);
                        alert("Failed to save speaker. Please try again.");
                      }
                    }}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all"
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    Save Speaker
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}