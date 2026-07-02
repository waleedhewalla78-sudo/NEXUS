export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger_type: 'comment' | 'dm' | 'mention';
  flow_json: {
    nodes: any[];
    edges: any[];
  };
}

export const automationTemplates: FlowTemplate[] = [
  {
    id: "tpl_keyword_reply",
    name: "Keyword Auto-Reply",
    description: "Reply automatically to comments containing specific keywords.",
    icon: "MessageSquare",
    trigger_type: "comment",
    flow_json: {
      nodes: [
        { id: "uuid-1", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Comment Trigger", platform: "instagram", condition: "contains", value: "PRICE" } },
        { id: "uuid-2", type: "action", position: { x: 100, y: 300 }, data: { label: "Auto Reply", action: "reply", message: "Check your DMs for the pricing link!" } }
      ],
      edges: [
        { id: "e-uuid-1-2", source: "uuid-1", target: "uuid-2" }
      ]
    }
  },
  {
    id: "tpl_lead_capture_dm",
    name: "Lead Capture DM",
    description: "Send a direct message with a link when a user comments 'guide' or 'cost'.",
    icon: "Send",
    trigger_type: "comment",
    flow_json: {
      nodes: [
        { id: "uuid-3", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Comment Trigger", platform: "instagram", condition: "contains", value: "guide" } },
        { id: "uuid-4", type: "action", position: { x: 100, y: 300 }, data: { label: "Send DM", action: "dm", message: "Here is the link: https://nexus.social/guide" } }
      ],
      edges: [
        { id: "e-uuid-3-4", source: "uuid-3", target: "uuid-4" }
      ]
    }
  },
  {
    id: "tpl_negative_sentiment",
    name: "Negative Sentiment Alert",
    description: "Notify your Slack channel immediately if a highly negative comment is posted.",
    icon: "AlertTriangle",
    trigger_type: "mention",
    flow_json: {
      nodes: [
        { id: "uuid-5", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Sentiment Trigger", platform: "any", condition: "sentiment_is", value: "negative" } },
        { id: "uuid-6", type: "action", position: { x: 100, y: 300 }, data: { label: "Slack Alert", action: "webhook", url: "https://hooks.slack.com/services/..." } }
      ],
      edges: [
        { id: "e-uuid-5-6", source: "uuid-5", target: "uuid-6" }
      ]
    }
  },
  {
    id: "tpl_welcome_follower",
    name: "Welcome New Follower",
    description: "Send a friendly welcome DM automatically to every new follower.",
    icon: "UserPlus",
    trigger_type: "dm",
    flow_json: {
      nodes: [
        { id: "uuid-7", type: "trigger", position: { x: 100, y: 100 }, data: { label: "New Follower", platform: "instagram", event: "follow" } },
        { id: "uuid-8", type: "action", position: { x: 100, y: 300 }, data: { label: "Welcome DM", action: "dm", message: "Thanks for the follow! Use code WELCOME10 for 10% off." } }
      ],
      edges: [
        { id: "e-uuid-7-8", source: "uuid-7", target: "uuid-8" }
      ]
    }
  },
  {
    id: "tpl_comment_to_story",
    name: "Comment-to-Story",
    description: "Reply to a top comment by tagging them in a generated story post.",
    icon: "Image",
    trigger_type: "comment",
    flow_json: {
      nodes: [
        { id: "uuid-9", type: "trigger", position: { x: 100, y: 100 }, data: { label: "Comment Trigger", platform: "instagram", condition: "contains", value: "LOVE" } },
        { id: "uuid-10", type: "action", position: { x: 100, y: 300 }, data: { label: "Story Mention", action: "story_mention" } }
      ],
      edges: [
        { id: "e-uuid-9-10", source: "uuid-9", target: "uuid-10" }
      ]
    }
  }
];
