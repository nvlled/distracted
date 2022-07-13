// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse and unparse this JSON data, add this code to your project and do:
//
//    reddit, err := UnmarshalReddit(bytes)
//    bytes, err = reddit.Marshal()

package reddit

import "encoding/json"

func UnmarshalReddit(data []byte) (Reddit, error) {
	var r Reddit
	err := json.Unmarshal(data, &r)
	return r, err
}

func (r *Reddit) Marshal() ([]byte, error) {
	return json.Marshal(r)
}

type Reddit struct {
	Kind string     `json:"kind"`
	Data RedditData `json:"data"`
}

type RedditData struct {
	After     string      `json:"after"`
	Dist      int64       `json:"dist"`
	Modhash   string      `json:"modhash"`
	GeoFilter interface{} `json:"geo_filter"`
	Children  []Child     `json:"children"`
	Before    interface{} `json:"before"`
}

type Child struct {
	Kind Kind      `json:"kind"`
	Data Subreddit `json:"data"`
}

type Subreddit struct {
	ApprovedAtUTC              interface{}     `json:"approved_at_utc"`
	Subreddit                  string          `json:"subreddit"`
	Selftext                   string          `json:"selftext"`
	AuthorFullname             string          `json:"author_fullname"`
	Saved                      bool            `json:"saved"`
	ModReasonTitle             interface{}     `json:"mod_reason_title"`
	Gilded                     int64           `json:"gilded"`
	Clicked                    bool            `json:"clicked"`
	Title                      string          `json:"title"`
	LinkFlairRichtext          []FlairRichtext `json:"link_flair_richtext"`
	SubredditNamePrefixed      string          `json:"subreddit_name_prefixed"`
	Hidden                     bool            `json:"hidden"`
	Pwls                       int64           `json:"pwls"`
	LinkFlairCSSClass          *string         `json:"link_flair_css_class"`
	Downs                      int64           `json:"downs"`
	ThumbnailHeight            *int64          `json:"thumbnail_height"`
	TopAwardedType             *string         `json:"top_awarded_type"`
	HideScore                  bool            `json:"hide_score"`
	Name                       string          `json:"name"`
	Quarantine                 bool            `json:"quarantine"`
	LinkFlairTextColor         FlairTextColor  `json:"link_flair_text_color"`
	UpvoteRatio                float64         `json:"upvote_ratio"`
	AuthorFlairBackgroundColor *string         `json:"author_flair_background_color"`
	Ups                        int64           `json:"ups"`
	TotalAwardsReceived        int64           `json:"total_awards_received"`
	MediaEmbed                 MediaEmbed      `json:"media_embed"`
	ThumbnailWidth             *int64          `json:"thumbnail_width"`
	AuthorFlairTemplateID      *string         `json:"author_flair_template_id"`
	IsOriginalContent          bool            `json:"is_original_content"`
	UserReports                []interface{}   `json:"user_reports"`
	SecureMedia                *Media          `json:"secure_media"`
	IsRedditMediaDomain        bool            `json:"is_reddit_media_domain"`
	IsMeta                     bool            `json:"is_meta"`
	Category                   interface{}     `json:"category"`
	SecureMediaEmbed           MediaEmbed      `json:"secure_media_embed"`
	LinkFlairText              *string         `json:"link_flair_text"`
	CanModPost                 bool            `json:"can_mod_post"`
	Score                      int64           `json:"score"`
	ApprovedBy                 interface{}     `json:"approved_by"`
	IsCreatedFromAdsUI         bool            `json:"is_created_from_ads_ui"`
	AuthorPremium              bool            `json:"author_premium"`
	Thumbnail                  string          `json:"thumbnail"`
	//Edited                     bool            `json:"edited"`
	AuthorFlairCSSClass *string         `json:"author_flair_css_class"`
	AuthorFlairRichtext []FlairRichtext `json:"author_flair_richtext"`
	Gildings            DataGildings    `json:"gildings"`
	PostHint            *PostHint       `json:"post_hint,omitempty"`
	ContentCategories   []string        `json:"content_categories"`
	IsSelf              bool            `json:"is_self"`
	SubredditType       SubredditType   `json:"subreddit_type"`
	Created             float64         `json:"created"`
	LinkFlairType       FlairType       `json:"link_flair_type"`
	Wls                 int64           `json:"wls"`
	RemovedByCategory   interface{}     `json:"removed_by_category"`
	BannedBy            interface{}     `json:"banned_by"`
	AuthorFlairType     FlairType       `json:"author_flair_type"`
	Domain              string          `json:"domain"`
	AllowLiveComments   bool            `json:"allow_live_comments"`
	SelftextHTML        *string         `json:"selftext_html"`
	Likes               interface{}     `json:"likes"`
	SuggestedSort       *string         `json:"suggested_sort"`
	BannedAtUTC         interface{}     `json:"banned_at_utc"`
	URLOverriddenByDest *string         `json:"url_overridden_by_dest,omitempty"`
	ViewCount           interface{}     `json:"view_count"`
	Archived            bool            `json:"archived"`
	NoFollow            bool            `json:"no_follow"`
	IsCrosspostable     bool            `json:"is_crosspostable"`
	Pinned              bool            `json:"pinned"`
	Over18              bool            `json:"over_18"`
	Preview             *Preview        `json:"preview,omitempty"`
	//AllAwardings               []AllAwarding             `json:"all_awardings,omitempty"`
	Awarders                 []interface{}             `json:"awarders"`
	MediaOnly                bool                      `json:"media_only"`
	LinkFlairTemplateID      *string                   `json:"link_flair_template_id,omitempty"`
	CanGild                  bool                      `json:"can_gild"`
	Spoiler                  bool                      `json:"spoiler"`
	Locked                   bool                      `json:"locked"`
	AuthorFlairText          *string                   `json:"author_flair_text"`
	TreatmentTags            []interface{}             `json:"treatment_tags"`
	Visited                  bool                      `json:"visited"`
	RemovedBy                interface{}               `json:"removed_by"`
	ModNote                  interface{}               `json:"mod_note"`
	Distinguished            *string                   `json:"distinguished"`
	SubredditID              string                    `json:"subreddit_id"`
	AuthorIsBlocked          bool                      `json:"author_is_blocked"`
	ModReasonBy              interface{}               `json:"mod_reason_by"`
	NumReports               interface{}               `json:"num_reports"`
	RemovalReason            interface{}               `json:"removal_reason"`
	LinkFlairBackgroundColor string                    `json:"link_flair_background_color"`
	ID                       string                    `json:"id"`
	IsRobotIndexable         bool                      `json:"is_robot_indexable"`
	ReportReasons            interface{}               `json:"report_reasons"`
	Author                   string                    `json:"author"`
	DiscussionType           interface{}               `json:"discussion_type"`
	NumComments              int64                     `json:"num_comments"`
	SendReplies              bool                      `json:"send_replies"`
	WhitelistStatus          WhitelistStatus           `json:"whitelist_status"`
	ContestMode              bool                      `json:"contest_mode"`
	ModReports               []interface{}             `json:"mod_reports"`
	AuthorPatreonFlair       bool                      `json:"author_patreon_flair"`
	AuthorFlairTextColor     *FlairTextColor           `json:"author_flair_text_color"`
	Permalink                string                    `json:"permalink"`
	ParentWhitelistStatus    WhitelistStatus           `json:"parent_whitelist_status"`
	Stickied                 bool                      `json:"stickied"`
	URL                      string                    `json:"url"`
	SubredditSubscribers     int64                     `json:"subreddit_subscribers"`
	CreatedUTC               float64                   `json:"created_utc"`
	NumCrossposts            int64                     `json:"num_crossposts"`
	Media                    *Media                    `json:"media"`
	IsVideo                  bool                      `json:"is_video"`
	IsGallery                *bool                     `json:"is_gallery,omitempty"`
	MediaMetadata            map[string]MediaMetadatum `json:"media_metadata,omitempty"`
	GalleryData              *GalleryData              `json:"gallery_data,omitempty"`
	//CrosspostParentList      []CrosspostParentList     `json:"crosspost_parent_list,omitempty"`
	CrosspostParent *string `json:"crosspost_parent,omitempty"`
}

type ResizedIcon struct {
	URL    string `json:"url"`
	Width  int64  `json:"width"`
	Height int64  `json:"height"`
}

type FlairRichtext struct {
	A *string `json:"a,omitempty"`
	E E       `json:"e"`
	U *string `json:"u,omitempty"`
	T *string `json:"t,omitempty"`
}

type MediaEmbedClass struct {
}

type GalleryData struct {
	Items []Item `json:"items"`
}

type Item struct {
	OutboundURL *string `json:"outbound_url,omitempty"`
	MediaID     string  `json:"media_id"`
	ID          int64   `json:"id"`
}

type DataGildings struct {
	Gid1 *int64 `json:"gid_1,omitempty"`
	Gid2 *int64 `json:"gid_2,omitempty"`
	Gid3 *int64 `json:"gid_3,omitempty"`
}

type Media struct {
	RedditVideo *RedditVideo `json:"reddit_video,omitempty"`
	Type        *string      `json:"type,omitempty"`
	Oembed      *Oembed      `json:"oembed,omitempty"`
}

type Oembed struct {
	ProviderURL     string `json:"provider_url"`
	Version         string `json:"version"`
	Title           string `json:"title"`
	Type            string `json:"type"`
	ThumbnailWidth  int64  `json:"thumbnail_width"`
	Height          int64  `json:"height"`
	Width           int64  `json:"width"`
	HTML            string `json:"html"`
	AuthorName      string `json:"author_name"`
	ProviderName    string `json:"provider_name"`
	ThumbnailURL    string `json:"thumbnail_url"`
	ThumbnailHeight int64  `json:"thumbnail_height"`
	AuthorURL       string `json:"author_url"`
}

type RedditVideo struct {
	BitrateKbps       int64             `json:"bitrate_kbps"`
	FallbackURL       string            `json:"fallback_url"`
	Height            int64             `json:"height"`
	Width             int64             `json:"width"`
	ScrubberMediaURL  string            `json:"scrubber_media_url"`
	DashURL           string            `json:"dash_url"`
	Duration          int64             `json:"duration"`
	HLSURL            string            `json:"hls_url"`
	IsGIF             bool              `json:"is_gif"`
	TranscodingStatus TranscodingStatus `json:"transcoding_status"`
}

type MediaEmbed struct {
	Content        *string `json:"content,omitempty"`
	Width          *int64  `json:"width,omitempty"`
	Scrolling      *bool   `json:"scrolling,omitempty"`
	Height         *int64  `json:"height,omitempty"`
	MediaDomainURL *string `json:"media_domain_url,omitempty"`
}

type MediaMetadatum struct {
	Status string `json:"status"`
	E      string `json:"e"`
	M      string `json:"m"`
	P      []S    `json:"p"`
	S      S      `json:"s"`
	ID     string `json:"id"`
}

type S struct {
	Y int64  `json:"y"`
	X int64  `json:"x"`
	U string `json:"u"`
}

type Preview struct {
	Images             []ImageElement `json:"images"`
	Enabled            bool           `json:"enabled"`
	RedditVideoPreview *RedditVideo   `json:"reddit_video_preview,omitempty"`
}

type ImageElement struct {
	Source      ResizedIcon   `json:"source"`
	Resolutions []ResizedIcon `json:"resolutions"`
	Variants    Variants      `json:"variants"`
	ID          string        `json:"id"`
}

type Variants struct {
	GIF        *GIF `json:"gif,omitempty"`
	Mp4        *GIF `json:"mp4,omitempty"`
	Obfuscated *GIF `json:"obfuscated,omitempty"`
	Nsfw       *GIF `json:"nsfw,omitempty"`
}

type GIF struct {
	Source      ResizedIcon   `json:"source"`
	Resolutions []ResizedIcon `json:"resolutions"`
}

type AwardSubType string

const (
	Appreciation AwardSubType = "APPRECIATION"
	Community    AwardSubType = "COMMUNITY"
	Global       AwardSubType = "GLOBAL"
	Premium      AwardSubType = "PREMIUM"
)

type AwardType string

const (
	AwardTypeCommunity AwardType = "community"
	AwardTypeGlobal    AwardType = "global"
)

type IconFormat string

const (
	Apng IconFormat = "APNG"
	PNG  IconFormat = "PNG"
)

type E string

const (
	EText E = "text"
	Emoji E = "emoji"
)

type FlairTextColor string

const (
	Dark  FlairTextColor = "dark"
	Empty FlairTextColor = ""
	Light FlairTextColor = "light"
)

type FlairType string

const (
	FlairTypeText FlairType = "text"
	Richtext      FlairType = "richtext"
)

type WhitelistStatus string

const (
	AllAds         WhitelistStatus = "all_ads"
	NoAds          WhitelistStatus = "no_ads"
	PromoAdultNsfw WhitelistStatus = "promo_adult_nsfw"
	SomeAds        WhitelistStatus = "some_ads"
)

type SubredditType string

const (
	Public SubredditType = "public"
)

type TranscodingStatus string

const (
	Completed TranscodingStatus = "completed"
)

type PostHint string

const (
	HostedVideo PostHint = "hosted:video"
	Image       PostHint = "image"
	Link        PostHint = "link"
	Self        PostHint = "self"
)

type Kind string

const (
	T3 Kind = "t3"
)
