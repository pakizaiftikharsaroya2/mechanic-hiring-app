import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    brand_logo: "AutoRescue",
    buy_spare_parts: "Buy Spare Parts",
    request_assistance: "Request Help",
    job_board: "Job Board",
    login: "Log In",
    logout: "Log Out",
    get_started: "Get Started",
    open_dashboard: "Request Help",
    profile: "Profile",
    
    // Hero Banner
    section_eyebrow: "Roadside Help, Reimagined for Pakistan",
    hero_title_1: "Your car breaks down.",
    hero_title_2: "We bring the mechanic to you.",
    hero_sub: "Find verified mechanics nearby, track them live on the map, and get back on the road — pay with Cash, JazzCash or EasyPaisa.",
    become_mechanic: "Become a Mechanic",
    
    // Login / Register
    login_title: "Log in to AutoRescue",
    client_tab: "Client (Emergency)",
    mechanic_tab: "Mechanic Portal",
    phone_label: "Phone Number *",
    otp_label: "4-Digit SMS Code *",
    send_otp: "Send OTP",
    verify_continue: "Verify & Continue",
    verify_request: "Verify & Request Help",
    mechanic_heading: "Mechanic Login",
    mechanic_sub: "Access your job board using your registered email credentials.",
    client_heading: "Roadside Help",
    client_sub: "No passwords or registration required. Verify instantly to request help.",
    or_divider: "OR",
    continue_google: "Continue with Google",
    register_google: "Register with Google",
    create_account: "Create account",
    i_am_a: "I want to register as a...",
    client_need_help: "Client needing help",
    full_name: "Full Name *",
    email_label: "Email address *",
    password_label: "Password *",
    
    // Links
    need_mechanic_account: "Need to register a mechanic account?",
    need_client_account: "Need a client account?",
    register_here: "Register here",
    already_have_account: "Already have an account?",
    login_here: "Log in here",

    // Mechanic Verification Sheet
    verification_heading: "Driver/Mechanic Identity Verification",
    specialty_label: "Mechanic Specialty Skill *",
    cnic_label: "CNIC Number * (Format: xxxxx-xxxxxxx-x)",
    cnic_front: "CNIC Card (Front) *",
    cnic_back: "CNIC Card (Back) *",
    live_capture: "Live Capture",
    selfie_label: "Verification Selfie *",
    camera_label: "Live camera:",
    cancel: "Cancel",
    capture_snapshot: "Capture Snapshot",

    // Profile Settings
    account_management: "Account Management",
    personal_details: "Personal Details",
    profile_sub: "Update your account information, contact details, and security passwords.",
    account_type: "Account Type",
    change_password_block: "Change Password",
    new_password: "New Password",
    new_password_placeholder: "Leave blank to keep your current password",
    save_profile_details: "Save Profile Details",
    saving: "Saving...",

    // General Dashboard / Buttons
    status: "Status",
    actions: "Actions",
    active: "Active",
    completed: "Completed",
    pending: "Pending",
    accepted: "Accepted",
    loading: "Loading...",

    // Stats
    "Active Mechanics": "Active Mechanics",
    "Typical Response (min)": "Typical Response (min)",
    "Cities Covered": "Cities Covered",

    // Steps
    "Request Help": "Request Help",
    "Describe your breakdown and share your location in under a minute.": "Describe your breakdown and share your location in under a minute.",
    "Get Matched": "Get Matched",
    "The nearest verified, online mechanic is notified instantly.": "The nearest verified, online mechanic is notified instantly.",
    "Track Your Mechanic": "Track Your Mechanic",
    "Watch them arrive on a live map, and chat in real time.": "Watch them arrive on a live map, and chat in real time.",
    "Get Back on the Road": "Get Back on the Road",
    "Job done, pay however suits you — cash, JazzCash, or EasyPaisa.": "Job done, pay however suits you — cash, JazzCash, or EasyPaisa.",

    // Real-Time Tracking Section
    "Real-Time Tracking": "Real-Time Tracking",
    "Watch your mechanic arrive, live": "Watch your mechanic arrive, live",
    "Once a mechanic accepts your request, their position updates on your map in real time — powered by live GPS and OpenStreetMap routing, not a guess. No more \"on my way\" with no way to verify it.": "Once a mechanic accepts your request, their position updates on your map in real time — powered by live GPS and OpenStreetMap routing, not a guess. No more \"on my way\" with no way to verify it.",
    "Live location updates, no refresh needed": "Live location updates, no refresh needed",
    "Turn-by-turn route drawn on the map": "Turn-by-turn route drawn on the map",
    "In-app chat with your mechanic": "In-app chat with your mechanic",
    "Live Tracking Preview": "Live Tracking Preview",
    "Map renders here once you sign in": "Map renders here once you sign in",

    // For Mechanics Section
    "For Mechanics": "For Mechanics",
    "Turn your skills into steady income": "Turn your skills into steady income",
    "Go online when you're free, get matched to nearby jobs automatically, and get paid your way. No subscriptions, no hidden cuts — you set your availability.": "Go online when you're free, get matched to nearby jobs automatically, and get paid your way. No subscriptions, no hidden cuts — you set your availability.",
    "Join as a Mechanic": "Join as a Mechanic",
    "Flexible hours": "Flexible hours",
    "Go ONLINE or OFFLINE anytime, from your own dashboard.": "Go ONLINE or OFFLINE anytime, from your own dashboard.",
    "Fair matching": "Fair matching",
    "Nearest available mechanic gets shown the job first.": "Nearest available mechanic gets shown the job first.",
    "Verified badge": "Verified badge",
    "Build trust with clients through ratings and job history.": "Build trust with clients through ratings and job history.",

    // Cities & Services
    "Pakistan Coverage": "Pakistan Coverage",
    "Cities we cover": "Cities we cover",
    "Services": "Services",
    "Whatever broke, we've got it covered": "Whatever broke, we've got it covered",
    
    // Spare Parts
    "Branded Parts Hub": "Branded Parts Hub",
    "Official Automotive Spare Parts": "Official Automotive Spare Parts",
    "AutoRescue acts as a digital marketplace connecting you directly with official manufacturer dealerships and brand-authorized distributors in Pakistan.": "AutoRescue acts as a digital marketplace connecting you directly with official manufacturer dealerships and brand-authorized distributors in Pakistan.",
    "Search spare parts...": "Search spare parts...",
    "All": "All",
    "Tires": "Tires",
    "Batteries": "Batteries",
    "Lubricants": "Lubricants",
    "Emergency Kits": "Emergency Kits",
    "Price": "Price",
    "Buy Now": "Buy Now",
    "No spare parts match your filters.": "No spare parts match your filters.",
    "Genuine {brand} Part": "Genuine {brand} Part",
    "{hub}": "{hub}",

    // Toyota OEM parts
    "part_toyota_pads_name": "Toyota Corolla Front Brake Pads (OEM)",
    "part_toyota_pads_desc": "Official Toyota Indus Motors genuine front disc brake pads. Restores factory stopping distances and preserves warranty.",
    "part_toyota_pads_brand": "Toyota Indus Motors",
    "part_toyota_pads_hub": "Toyota Dealership Network",
    
    // Honda OEM parts
    "part_honda_filter_name": "Honda Civic Premium Air Filter Element",
    "part_honda_filter_desc": "Official Honda Atlas genuine engine air filter element. Keeps dust particles out of Civic engines. Dispatched from official parts counters.",
    "part_honda_filter_brand": "Honda Atlas Cars",
    "part_honda_filter_hub": "Honda Dealership Network",

    // Suzuki Genuine parts
    "part_suzuki_oil_name": "Suzuki Alto Genuine Maintenance Kit",
    "part_suzuki_oil_desc": "Official Suzuki Genuine Parts (SGP) combo pack. Includes oil filter and Suzuki-recommended engine oil.",
    "part_suzuki_oil_brand": "Pak Suzuki Motor Company",
    "part_suzuki_oil_hub": "Suzuki Dealership Network",

    // AGS Battery
    "part_ags_battery_name": "AGS MF65 Maintenance-Free Battery",
    "part_ags_battery_desc": "Official AGS maintenance-free battery for Suzuki Alto, WagonR, and Cultus. Sourced from Atlas Battery authorized distributors.",
    "part_ags_battery_brand": "AGS Battery Pakistan",
    "part_ags_battery_hub": "AGS Distributor Network",

    // Michelin
    "part_michelin_name": "Michelin Pilot Sport 4 (18-Inch Tire)",
    "part_michelin_desc": "High-performance passenger car tire. Sourced from Michelin Pakistan authorized importers for Civic RS or luxury sedans.",
    "part_michelin_brand": "Michelin Pakistan",
    "part_michelin_hub": "Michelin Authorized Importers",

    // Caltex
    "part_caltex_oil_name": "Caltex Havoline Formula 10W-30 Oil",
    "part_caltex_oil_desc": "4 Liters Caltex Havoline motor oil. Advanced engine protection under extreme hot climates in local cities.",
    "part_caltex_oil_brand": "Caltex Pakistan",
    "part_caltex_oil_hub": "Caltex Official Depot",

    // Yokohama
    "part_yokohama_name": "Yokohama Advan Decibel V701 (Tire)",
    "part_yokohama_desc": "Comfort-comfort passenger car tire. Sourced from Yokohama Pakistan authorized dealer networks to ensure premium quality.",
    "part_yokohama_brand": "Yokohama Pakistan",
    "part_yokohama_hub": "Yokohama Dealer Network",

    // Exide
    "part_exide_battery_name": "Exide MF-90 Heavy-Duty Battery",
    "part_exide_battery_desc": "Exide premium maintenance-free battery for SUVs and pickups. Sourced from official Exide Pakistan dealerships.",
    "part_exide_battery_brand": "Exide Pakistan",
    "part_exide_battery_hub": "Exide Dealer Network",

    // Trust Grid
    "Verified Mechanics": "Verified Mechanics",
    "Every mechanic is identity-checked before going live on the platform.": "Every mechanic is identity-checked before going live on the platform.",
    "Transparent Pricing": "Transparent Pricing",
    "You set your budget upfront — no surprise charges after the job.": "You set your budget upfront — no surprise charges after the job.",
    "Rated by Real Clients": "Rated by Real Clients",
    "Job history and ratings follow every mechanic, visible before you accept.": "Job history and ratings follow every mechanic, visible before you accept.",

    // Final CTA
    "Stuck on the road? Help is minutes away.": "Stuck on the road? Help is minutes away.",
    "Join AutoRescue Pakistan today — as a client or a mechanic.": "Join AutoRescue Pakistan today — as a client or a mechanic.",
    "Get Started — It's Free": "Get Started — It's Free",
    "Go to Mechanic Board": "Go to Mechanic Board",
    "Request Assistance Now": "Request Help Now",

    // Checkout Modal
    "Confirm Sourcing Order": "Confirm Sourcing Order",
    "Checkout Part": "Checkout Part",
    "Full Name *": "Full Name *",
    "Email Address *": "Email Address *",
    "Contact Phone *": "Contact Phone *",
    "Destination City *": "Destination City *",
    "Complete Delivery Address *": "Complete Delivery Address *",
    "Payment Method *": "Payment Method *",
    "Cash on Delivery (COD)": "Cash on Delivery (COD)",
    "Debit / Credit Card": "Debit / Credit Card",
    "JazzCash Mobile Wallet": "JazzCash Mobile Wallet",
    "EasyPaisa Mobile Wallet": "EasyPaisa Mobile Wallet",
    "Product Price:": "Product Price:",
    "Fitting & Installation Charge:": "Fitting & Installation Charge:",
    "Total Amount:": "Total Amount:",
    "Dispatch an AutoRescue mechanic to install/fit this part (+ Rs. 1,500 Fitting Charge)": "Dispatch an AutoRescue mechanic to install/fit this part (+ Rs. 1,500 Fitting Charge)",
    
    // Warnings
    "toyota_warning_title": "Toyota Dealership Workshop Alert:",
    "toyota_warning_body": "Installing parts outside official Toyota Indus Motors authorized workshops can void your vehicle's warranty. This genuine Toyota part is OEM-certified, but we recommend booking towing to an official dealership workshop if under active warranty.",

    // Cities
    "Lahore": "Lahore",
    "Karachi": "Karachi",
    "Islamabad": "Islamabad",
    "Rawalpindi": "Rawalpindi",
    "Faisalabad": "Faisalabad",
    "Multan": "Multan",

    // Services
    "Flat Tire": "Flat Tire",
    "Battery": "Battery",
    "Engine": "Engine",
    "Electrical": "Electrical",
    "Towing": "Towing",
    "Diagnostics": "Diagnostics",
    "Emergency Repair": "Emergency Repair",

    // Client Dashboard Console
    client_console_title: "Roadside Help Console",
    client_console_sub: "Request roadside help anywhere in Pakistan. Pay with Cash, JazzCash or EasyPaisa.",
    req_emergency_assistance: "Request Emergency Help",
    vehicle_make: "Vehicle Make *",
    select_make: "Select Make",
    vehicle_model: "Vehicle Model *",
    vehicle_color: "Vehicle Color",
    breakdown_type: "Breakdown Type *",
    service_type: "Service Type *",
    breakdown_location: "Breakdown Location *",
    use_my_location: "Use my location",
    locating: "Locating...",
    gps_captured: "GPS coordinates captured",
    your_budget: "Your Budget (PKR) *",
    payment_method: "Payment Method *",
    details_notes: "Details / Notes for Mechanic",
    placeholder_landmarks: "Describe warning lights, noises, exact location landmarks...",
    broadcast_request: "Broadcast Help Request",
    broadcasting: "Broadcasting...",
    your_requests: "Your Requests",
    no_requests_yet: "No requests yet. Submit a request to start.",
    pay_via: "Pay via:",
    live_tracking_map: "Live Tracking Map",
    heading_to_location: "Heading to your location...",
    request_summary: "Request Summary",
    assigned_mechanic: "Assigned Mechanic:",
    waiting_mechanic_accept: "Waiting for nearest mechanic to accept...",
    cancel_request: "Cancel Request",
    back_to_dashboard: "Request New Help",
    tow_toyota_workshop: "Tow to Nearest Toyota 3S Workshop",
    accident_toggle_label: "Vehicle Involved in Accident / Major Collision",
    accident_badge: "Accident / Collision Case",
    accident_note: "Accident towing connects you with authorized flatbed recovery trucks directly to official 3S company dealerships or your chosen workshop.",
    tow_destination_heading: "Select Workshop Towing Destination",
    tow_dest_company: "Nearest Official 3S Company Dealership (Preserves Warranty & Insurance Claims)",
    tow_dest_local: "Local Independent Garage / Workshop",
    tow_dest_custom: "Custom Workshop / Destination Address (Type below)",
    custom_make_label: "Specify Vehicle Make *",
    custom_make_placeholder: "Type vehicle make (e.g. Haval, Chery, BAIC, Audi, BMW...)",
    custom_issue_label: "Specify Breakdown Fault / Issue *",
    custom_issue_placeholder: "Describe the exact mechanical issue or damage...",
    custom_dest_label: "Custom Destination / Workshop Address *",
    custom_dest_placeholder: "Enter workshop name, plaza, street and city...",

    // Mechanic Dashboard Console
    mech_console_title: "Mechanic Dispatch Console",
    mech_console_sub: "Accept jobs near you across Pakistan. Go online to start receiving requests.",
    go_online: "Go Online",
    go_offline: "Go Offline",
    verification_pending_title: "Account Verification Status: Pending Admin Review (CNIC Standard check)",
    verification_pending_body: "AutoRescue enforces standard background and CNIC checks for road safety. Your submitted CNIC and document scans are currently being validated by our verification team. You can toggle ONLINE to test the console, but your profile remains unverified on client map boards until documents are approved.",
    offline_title: "You're offline",
    offline_sub: "Go online to see and accept nearby requests.",
    no_active_requests_title: "No active requests right now.",
    no_active_requests_sub: "New requests will appear here automatically.",
    accept_job: "Accept Job",
    job_history: "Job History",
    no_completed_jobs: "No completed jobs yet.",
    navigation_routing: "Navigation & Routing",
    heading_to_client: "Heading to Client!",
    active_job: "Active Job",
    start_driving: "Start Driving (En Route)",
    driving_to_client: "Driving to client location...",
    confirm_arrival: "Confirm Arrival",
    start_repair: "Start Repair",
    mark_completed: "🛠 Mark Job Completed",
    back_to_job_board: "📁 Back to Job Board",
    cancel_job: "Cancel Job",
    client_brief: "Client Brief",
    client_label: "Client:",
    phone_label_no_star: "Phone:",
    vehicle_label: "Vehicle:",
    payout_label: "Payout:",
    payment_method_label: "Payment Method:",
    client_notes: "Client Notes:",
    distance_label: "Distance:",
    away: "away",

    // Missing Landing Page Heading
    "From breakdown to back-on-the-road, in four steps": "From breakdown to back-on-the-road, in four steps",

    // Dropdown Labels
    "Dead Battery": "Dead Battery",
    "Engine Overheat": "Engine Overheat",
    "Key Lockout": "Key Lockout",
    "Out of Fuel": "Out of Fuel",
    "Brake Problem": "Brake Problem",
    "Other Mechanical": "Other Mechanical",
    "On-site Repair": "On-site Repair",
    "Battery Jump Start": "Battery Jump Start",
    "Tire Change": "Tire Change",
    "Fuel Delivery": "Fuel Delivery",
    "Towing Service": "Towing Service",
    "Cash on Completion": "Cash on Completion",
    "Bank Transfer": "Bank Transfer",

    // Timeline Steps
    "Sent": "Sent",
    "Claimed": "Claimed",
    "En Route": "En Route",
    "Arrived": "Arrived",

    // Request status values
    "PENDING": "Pending",
    "ACCEPTED": "Accepted",
    "EN_ROUTE": "En Route",
    "ARRIVED": "Arrived",
    "IN_PROGRESS": "In Progress",
    "COMPLETED": "Completed",
    "CANCELLED": "Cancelled",

    // Vehicle Makes
    "Toyota": "Toyota",
    "Honda": "Honda",
    "Suzuki": "Suzuki",
    "Hyundai": "Hyundai",
    "Kia": "Kia",
    "MG": "MG",
    "Changan": "Changan",
    "Proton": "Proton",
    "Other": "Other",

    // Placeholders and e.g. details
    "phone_placeholder": "e.g. 03001234567",
    "otp_placeholder_input": "Enter OTP",
    "phone_placeholder_mechanic": "03xx-xxxxxxx",
    "cnic_placeholder": "35201-1234567-1",
    "verifying": "Verifying...",
    "logging_in": "Logging in...",
    "No additional details provided.": "No additional details provided.",
    "Not specified": "Not specified",
    "model_placeholder": "e.g. Corolla, Civic, Alto, Cultus",
    "color_placeholder": "e.g. White, Black, Silver",
    "location_placeholder": "e.g. Shahrah-e-Faisal, Karachi or GT Road, Lahore",
    "budget_placeholder": "e.g. 4000",

    // Specialties
    "Engine Diagnostics": "Engine Diagnostics",
    "Tire Specialist": "Tire Specialist",
    "Electrical Expert": "Electrical Expert",
    "Battery Service": "Battery Service",
    "Brake Mechanic": "Brake Mechanic",

    // Missing chat buttons and payment types
    "message_placeholder": "Message...",
    "send_btn": "Send",
    "Cash": "Cash",
    "JazzCash": "JazzCash",
    "EasyPaisa": "EasyPaisa",
    "Budget:": "Budget:",
    "Location:": "Location:",
    "Payment:": "Payment:",
    "Complete Delivery Address": "Complete Delivery Address",

    // Cancellation reasons modal
    "cancel_modal_title": "Cancellation Reason",
    "cancel_modal_sub": "Please select a reason for cancelling this request:",
    "reason_another_solution": "Found another solution",
    "reason_too_long": "Mechanic is taking too long",
    "reason_changed_mind": "Changed my mind",
    "reason_wrong_details": "Wrong vehicle/location details",
    "reason_other": "Other",
    "confirm_cancellation_btn": "Confirm Cancellation",
    "other_reason_placeholder": "Please specify other reason...",
    "mechanic_matched_coordinating": "Mechanic matched! Coordinating...",
    "mechanic_on_way": "Mechanic is on the way...",
    "mechanic_arrived": "Mechanic has arrived!",
    "repair_in_progress": "Repair in progress...",

    // Client custom login credentials options
    "phone_email_label": "Phone Number or Email *",
    "phone_email_placeholder": "e.g. 03001234567 or email@example.com",
    "coordination_desk": "Live Support Chat",
    "chat_with": "Chat with {name}",
    "chat_secure_title": "AutoRescue Live Coordination Desk",
    "chat_secure_sub": "Direct channel connected with your verified assistance team. Share parking landmarks or ask for ETA.",
    "quick_messages_label": "⚡ Quick Suggestions (Tap to send):",
    "quick_msg_1": "📍 I am waiting by the roadside with hazard lights on.",
    "quick_msg_2": "⏳ What is your estimated time of arrival (ETA)?",
    "quick_msg_3": "🔑 I have my car keys and documents ready.",
    "quick_msg_4": "⛽ I am parked near the main fuel station.",
    "chat_secure_sub_mechanic": "Direct channel connected with your client. Share your live ETA, confirm vehicle location, or ask for landmarks.",
    "mech_quick_msg_1": "🚗 I am on my way to your location. ETA ~10-15 mins.",
    "mech_quick_msg_2": "📍 I have arrived at your breakdown spot. Please turn on hazard lights.",
    "mech_quick_msg_3": "📞 I am calling your phone to locate your exact vehicle.",
    "mech_quick_msg_4": "🔧 Tools and diagnostic equipment ready for inspection.",
    "request_again": "Request Again",
    "Request Cancelled": "Request Cancelled",
    "This request was cancelled. You can request again with the same vehicle & location details.": "This request was cancelled. You can request again with the same vehicle & location details.",
    "clear_history": "Clear History",
    "chat_locked_title": "Live Chat Locked",
    "chat_locked_sub": "Direct messaging unlocks automatically once a nearby mechanic accepts your roadside request.",
    "mech_cancel_job": "Decline / Release Job",
    "mech_cancel_confirm": "Are you sure you want to release this job back to the broadcast board for other mechanics?",
    "cannot_cancel_enroute_half": "Cancellation is locked because the mechanic has already covered more than half the distance to your location.",
    "client_cancelled_notice": "⚠️ The client has cancelled this request.",
    "job_released_success": "Job released back to available board. You are now ONLINE.",
    "decline_request": "Decline",
    "market_estimate_badge": "Official Fair Price Estimate",
    "suggested_price": "Suggested Fare",
    "price_range_note": "Standard market rate for this vehicle and diagnostic issue.",
    "incoming_offers_title": "Incoming Mechanic Offers",
    "no_offers_yet": "Broadcasting to nearby mechanics... Their price offers will appear here live in real-time.",
    "accept_offer_btn": "Accept Offer",
    "offer_different_price": "Offer Custom Fare",
    "send_counter_offer": "Send Offer",
    "offer_sent_waiting": "Offer sent. Waiting for client approval...",
    "fair_price_recommendation": "Estimated Fare Range",
    "custom_offer_placeholder": "Enter custom PKR (e.g. 2800)",
    
    // Mechanic Dispatch Console
    "incoming_requests": "Incoming Requests",
    "job_history": "Job History",
    "offline_title": "You are currently Offline",
    "offline_sub": "Go online to start receiving nearby emergency breakdown requests.",
    "no_active_requests_title": "No active requests right now.",
    "no_active_requests_sub": "New requests will appear here automatically.",
    "no_completed_jobs": "No completed jobs yet."
  },
  ur: {
    brand_logo: "آٹو ریسکیو",
    buy_spare_parts: "اسپیئر پارٹس",
    request_assistance: "مدد حاصل کریں",
    job_board: "جاب بورڈ",
    login: "لاگ ان کریں",
    logout: "لاگ آؤٹ",
    get_started: "شروع کریں",
    open_dashboard: "مدد حاصل کریں",
    profile: "پروفائل",
    
    // Hero Banner
    section_eyebrow: "سڑک کنارے مدد، پاکستان کے لیے ایک نیا انداز",
    hero_title_1: "آپ کی گاڑی خراب ہوتی ہے۔",
    hero_title_2: "ہم مکینک کو آپ کے پاس لاتے ہیں۔",
    hero_sub: "قریب ترین تصدیق شدہ مکینکس تلاش کریں، نقشے پر لائیو ٹریک کریں، اور دوبارہ سفر شروع کریں — کیش، جیز کیش یا ایزی پیسہ کے ذریعے ادائیگی کریں۔",
    become_mechanic: "مکینک بنیں",
    
    // Login / Register
    login_title: "آٹو ریسکیو لاگ ان",
    client_tab: "کلائنٹ (ہنگامی)",
    mechanic_tab: "مکینک پورٹل",
    phone_label: "فون نمبر *",
    otp_label: "4 ہندسوں کا ایس ایم ایس کوڈ *",
    send_otp: "او ٹی پی بھیجیں",
    verify_continue: "تصدیق اور جاری رکھیں",
    verify_request: "تصدیق اور مدد حاصل کریں",
    mechanic_heading: "مکینک لاگ ان",
    mechanic_sub: "اپنے رجسٹرڈ ای میل لاگ ان کے ساتھ جاب بورڈ کھولیں۔",
    client_heading: "ہنگامی مدد",
    client_sub: "پاس ورڈ یا رجسٹریشن کی ضرورت نہیں ہے۔ ہنگامی مدد کے لیے فوری تصدیق کریں۔",
    or_divider: "یا",
    continue_google: "گوگل کے ساتھ لاگ ان",
    register_google: "گوگل کے ساتھ رجسٹریشن",
    create_account: "اکاؤنٹ بنائیں",
    i_am_a: "میں رجسٹر ہونا چاہتا ہوں بطور...",
    client_need_help: "کلائنٹ (مدد درکار ہے)",
    full_name: "پورا نام *",
    email_label: "ای میل ایڈریس *",
    password_label: "پاس ورڈ *",
    
    // Links
    need_mechanic_account: "کیا آپ کو مکینک اکاؤنٹ کی ضرورت ہے؟",
    need_client_account: "کیا آپ کو کلائنٹ اکاؤنٹ کی ضرورت ہے؟",
    register_here: "یہاں رجسٹر کریں",
    already_have_account: "پہلے سے ہی اکاؤنٹ موجود ہے؟",
    login_here: "یہاں لاگ ان کریں",
    
    // Mechanic Verification Sheet
    verification_heading: "ڈرائیور/مکینک شناختی تصدیق",
    specialty_label: "مکینک کی مہارت *",
    cnic_label: "شناختی کارڈ نمبر * (فارمیٹ: xxxxx-xxxxxxx-x)",
    cnic_front: "شناختی کارڈ (فرنٹ) *",
    cnic_back: "شناختی کارڈ (بیک) *",
    live_capture: "لائیو تصویر",
    selfie_label: "تصدیقی سیلفی *",
    camera_label: "لائیو کیمرہ:",
    cancel: "منسوخ کریں",
    capture_snapshot: "تصویر کھینچیں",

    // Profile Settings
    account_management: "اکاؤنٹ کی ترتیبات",
    personal_details: "ذاتی معلومات",
    profile_sub: "اپنے اکاؤنٹ کی معلومات، رابطے کی تفصیلات، اور سیکیورٹی پاس ورڈز اپ ڈیٹ کریں۔",
    account_type: "Account Type",
    change_password_block: "پاس ورڈ تبدیل کریں",
    new_password: "نیا پاس ورڈ",
    new_password_placeholder: "اپنا موجودہ پاس ورڈ رکھنے کے لیے خالی چھوڑ دیں",
    save_profile_details: "پروفائل محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",

    // General Dashboard / Buttons
    status: "حیثیت",
    actions: "اقدامات",
    active: "فعال",
    completed: "مکمل",
    pending: "زیر التواء",
    accepted: "قبول شدہ",
    loading: "لوڈ ہو رہا ہے...",

    // Stats
    "Active Mechanics": "سرگرم مکینکس",
    "Typical Response (min)": "اوسط جوابی وقت (منٹ)",
    "Cities Covered": "شہروں کی تعداد",

    // Steps
    "Request Help": "مدد کی درخواست",
    "Describe your breakdown and share your location in under a minute.": "ایک منٹ سے بھی کم وقت میں اپنی گاڑی کی خرابی بتائیں اور لوکیشن شیئر کریں۔",
    "Get Matched": "مکینک کا انتخاب",
    "The nearest verified, online mechanic is notified instantly.": "قریب ترین دستیاب تصدیق شدہ مکینک کو فوری طور پر مطلع کیا جاتا ہے۔",
    "Track Your Mechanic": "میکینک کی ٹریکنگ",
    "Watch them arrive on a live map, and chat in real time.": "انہیں لائیو نقشے پر آتے دیکھیں اور فوری چیٹ کریں۔",
    "Get Back on the Road": "دوبارہ سفر شروع",
    "Job done, pay however suits you — cash, JazzCash, or EasyPaisa.": "کام مکمل ہونے پر اپنی مرضی کے مطابق ادائیگی کریں — کیش، جیز کیش یا ایزی پیسہ۔",

    // Real-Time Tracking Section
    "Real-Time Tracking": "لائیو لوکیشن ٹریکنگ",
    "Watch your mechanic arrive, live": "مکینک کو لائیو نقشے پر آتے دیکھیں",
    "Once a mechanic accepts your request, their position updates on your map in real time — powered by live GPS and OpenStreetMap routing, not a guess. No more \"on my way\" with no way to verify it.": "جب مکینک آپ کا کام قبول کرتا ہے، نقشے پر ان کی پوزیشن لائیو اپ ڈیٹ ہوتی ہے۔ اب کوئی اندازہ یا جھوٹا انتظار نہیں۔",
    "Live location updates, no refresh needed": "لائیو پوزیشن اپ ڈیٹس، کسی ریفریش کی ضرورت نہیں",
    "Turn-by-turn route drawn on the map": "نقشے پر درست روٹ اور راستہ",
    "In-app chat with your mechanic": "ایپ کے اندر مکینک کے ساتھ چیٹ",
    "Live Tracking Preview": "لائیو ٹریکنگ کا پیش نظارہ",
    "Map renders here once you sign in": "لاگ ان کرنے کے بعد نقشہ یہاں نظر آئے گا",

    // For Mechanics Section
    "For Mechanics": "مکینکس کے لیے",
    "Turn your skills into steady income": "اپنی مہارت کو مستقل آمدنی میں بدلیں",
    "Go online when you're free, get matched to nearby jobs automatically, and get paid your way. No subscriptions, no hidden cuts — you set your availability.": "جب فارغ ہوں آن لائن جائیں، قریبی کام حاصل کریں، اور براہ راست ادائیگی وصول کریں۔ کوئی پوشیدہ چارجز نہیں۔",
    "Join as a Mechanic": "بطور مکینک شامل ہوں",
    "Flexible hours": "لچکدار اوقات",
    "Go ONLINE or OFFLINE anytime, from your own dashboard.": "اپنے ڈیش بورڈ سے کسی بھی وقت آن لائن یا آف لائن جائیں۔",
    "Fair matching": "انصاف پسند تقسیم",
    "Nearest available mechanic gets shown the job first.": "قریبی ترین دستیاب مکینک کو کام سب سے پہلے ملتا ہے۔",
    "Verified badge": "تصدیق شدہ بیج",
    "Build trust with clients through ratings and job history.": "ریٹنگز اور کام کی ہسٹری کے ذریعے صارفین کا اعتماد جیتیں۔",

    // Cities & Services
    "Pakistan Coverage": "پاکستان میں نیٹ ورک",
    "Cities we cover": "وہ شہر جہاں ہم سروس دیتے ہیں",
    "Services": "ہماری خدمات",
    "Whatever broke, we've got it covered": "گاڑی کا کوئی بھی مسئلہ ہو، ہم حل کریں گے",
    
    // Spare Parts
    "Branded Parts Hub": "اسپیئر پارٹس اسٹور",
    "Official Automotive Spare Parts": "اصلی اور معیاری اسپیئر پارٹس",
    "AutoRescue acts as a digital marketplace connecting you directly with official manufacturer dealerships and brand-authorized distributors in Pakistan.": "آٹو ریسکیو آپ کو پاکستان کے آفیشل ڈیلرشپس اور تصدیق شدہ اسپیئر پارٹس فراہم کنندگان سے براہ راست جوڑتا ہے۔",
    "Search spare parts...": "اسپیئر پارٹس تلاش کریں...",
    "All": "تمام",
    "Tires": "ٹائر",
    "Batteries": "بیٹریاں",
    "Lubricants": "موبل آئل",
    "Emergency Kits": "ہنگامی کٹس",
    "Price": "قیمت",
    "Buy Now": "ابھی خریدیں",
    "No spare parts match your filters.": "کوئی اسپیئر پارٹ میچ نہیں ہوا۔",
    "Genuine {brand} Part": "اصلی {brand} پارٹ",
    "{hub}": "{hub}",

    // Toyota OEM parts
    "part_toyota_pads_name": "ٹویوٹا کرولا فرنٹ بریک پیڈز (OEM)",
    "part_toyota_pads_desc": "آفیشل ٹویوٹا انڈس موٹرز کے بریک پیڈز۔ گاڑی کی وارنٹی برقرار اور بریکنگ بہترین۔",
    "part_toyota_pads_brand": "ٹویوٹا انڈس موٹرز",
    "part_toyota_pads_hub": "ٹویوٹا ڈیلرشپ نیٹ ورک",
    
    // Honda OEM parts
    "part_honda_filter_name": "ہونڈا سیوک ایئر فلٹر",
    "part_honda_filter_desc": "آفیشل ہونڈا اطلس کا انجن ایئر فلٹر۔ انجن کو مٹی اور کچرے سے محفوظ رکھے۔",
    "part_honda_filter_brand": "ہونڈا اطلس کارز",
    "part_honda_filter_hub": "ہونڈا ڈیلرشپ نیٹ ورک",

    // Suzuki Genuine parts
    "part_suzuki_oil_name": "سوزوکی آلٹو مینٹیننس کٹ",
    "part_suzuki_oil_desc": "آفیشل سوزوکی جینون پارٹس (SGP) پیک۔ آئل فلٹر اور سوزوکی انجن آئل شامل ہے۔",
    "part_suzuki_oil_brand": "پاک سوزوکی موٹر کمپنی",
    "part_suzuki_oil_hub": "سوزوکی ڈیلرشپ نیٹ ورک",

    // AGS Battery
    "part_ags_battery_name": "اے جی ایس MF65 بیٹری (بغیر پانی)",
    "part_ags_battery_desc": "سوزوکی آلٹو، ویگن آر اور کلٹس کے لیے بہترین بیٹری۔ اطلس بیٹری ڈسٹریبیوٹرز سے تصدیق شدہ۔",
    "part_ags_battery_brand": "اے جی ایس بیٹری پاکستان",
    "part_ags_battery_hub": "اے جی ایس ڈسٹریبیوٹر نیٹ ورک",

    // Michelin
    "part_michelin_name": "میشلن پائلٹ اسپورٹ 4 ٹائر (18-انچ)",
    "part_michelin_desc": "بہترین کارکردگی والا مسافر گاڑی کا ٹائر۔ سیوک آر ایس یا لگژری گاڑیوں کے لیے تصدیق شدہ درآمد شدہ ٹائر۔",
    "part_michelin_brand": "میشلن پاکستان",
    "part_michelin_hub": "میشلن کے آفیشل امپورٹرز",

    // Caltex
    "part_caltex_oil_name": "کالٹیکس ہیولین فارمولا 10W-30 آئل",
    "part_caltex_oil_desc": "4 لیٹر ہیولین انجن آئل۔ شدید گرم موسم اور شہروں کے ٹریفک میں انجن کا محافظ۔",
    "part_caltex_oil_brand": "کالٹیکس پاکستان",
    "part_caltex_oil_hub": "کالٹیکس آفیشل ڈپو",

    // Yokohama
    "part_yokohama_name": "یوکوہاما ایڈوان ڈیسیبل ٹائر",
    "part_yokohama_desc": "نہایت پرسکون اور آرام دہ سفر کا ضامن۔ یوکوہاما پاکستان کے ڈیلر نیٹ ورک سے تصدیق شدہ ٹائر۔",
    "part_yokohama_brand": "یوکوہاما پاکستان",
    "part_yokohama_hub": "یوکوہاما ڈیلر نیٹ ورک",

    // Exide
    "part_exide_battery_name": "ایکسائیڈ MF-90 ہیوی ڈیوٹی بیٹری",
    "part_exide_battery_desc": "ایس یو وی اور پک اپس کے لیے بہترین ایکسائیڈ ڈبل پاور بیٹری۔ ایکسائیڈ پاکستان سے تصدیق شدہ۔",
    "part_exide_battery_brand": "ایکسائیڈ پاکستان",
    "part_exide_battery_hub": "ایکسائیڈ ڈیلر نیٹ ورک",

    // Trust Grid
    "Verified Mechanics": "تصدیق شدہ مکینکس",
    "Every mechanic is identity-checked before going live on the platform.": "ہر مکینک کو آن لائن کام شروع کرنے سے پہلے شناختی تصدیق سے گزرنا پڑتا ہے۔",
    "Transparent Pricing": "شفاف ریٹس",
    "You set your budget upfront — no surprise charges after the job.": "آپ بجٹ پہلے طے کرتے ہیں — کام مکمل ہونے کے بعد کوئی اضافی پوشیدہ چارجز نہیں۔",
    "Rated by Real Clients": "صارفین کی ریٹنگز",
    "Job history and ratings follow every mechanic, visible before you accept.": "مکینکس کی ریٹنگز اور کام کی تاریخ کام قبول کرنے سے پہلے واضح نظر آتی ہے۔",

    // Final CTA
    "Stuck on the road? Help is minutes away.": "سڑک پر پھنس گئے ہیں؟ مدد چند منٹوں کے فاصلے پر ہے۔",
    "Join AutoRescue Pakistan today — as a client or a mechanic.": "آج ہی آٹو ریسکیو پاکستان کا حصہ بنیں — بطور کلائنٹ یا مکینک۔",
    "Get Started — It's Free": "شروع کریں — یہ بالکل مفت ہے",
    "Go to Mechanic Board": "مکینک بورڈ پر جائیں",
    "Request Assistance Now": "ابھی مدد حاصل کریں",

    // Checkout Modal
    "Confirm Sourcing Order": "آرڈر کی تصدیق کریں",
    "Checkout Part": "آرڈر چیک آؤٹ",
    "Full Name *": "پورا نام *",
    "Email Address *": "ای میل ایڈریس *",
    "Contact Phone *": "رابطہ فون نمبر *",
    "Destination City *": "شہر کا نام *",
    "Complete Delivery Address *": "ڈیلیوری کا مکمل پتہ *",
    "Payment Method *": "ادائیگی کا طریقہ کار *",
    "Cash on Delivery (COD)": "کیش آن ڈیلیوری (COD)",
    "Debit / Credit Card": "ڈیبٹ / کریڈٹ کارڈ",
    "JazzCash Mobile Wallet": "جیز کیش موبائل والٹ",
    "EasyPaisa Mobile Wallet": "ایزی پیسہ موبائل والٹ",
    "Product Price:": "پروڈکٹ کی قیمت:",
    "Fitting & Installation Charge:": "فٹنگ اور انسٹالیشن چارجز:",
    "Total Amount:": "کل رقم:",
    "Dispatch an AutoRescue mechanic to install/fit this part (+ Rs. 1,500 Fitting Charge)": "آٹو ریسکیو مکینک کو فٹنگ کے لیے بھیجیں (+ 1500 روپے فٹنگ فیس)",
    
    // Warnings
    "toyota_warning_title": "ٹویوٹا ڈیلرشپ ورکشاپ الرٹ:",
    "toyota_warning_body": "آفیشل ٹویوٹا انڈس موٹرز ورکشاپس کے باہر پارٹس فٹ کروانے سے آپ کی گاڑی کی وارنٹی ختم ہو سکتی ہے۔ یہ اصلی ٹویوٹا پارٹ ہے، لیکن اگر گاڑی وارنٹی میں ہے تو ہم آفیشل ڈیلرشپ سے کام کروانے کی سفارش کرتے ہیں۔",

    // Cities
    "Lahore": "لاہور",
    "Karachi": "کراچی",
    "Islamabad": "اسلام آباد",
    "Rawalpindi": "راولپنڈی",
    "Faisalabad": "فیصل آباد",
    "Multan": "ملتان",

    // Services
    "Flat Tire": "فلیٹ ٹائر",
    "Battery": "بیٹری سروس",
    "Engine": "انجن کا کام",
    "Electrical": "وائرنگ کا کام",
    "Towing": "ٹونگ سروس",
    "Diagnostics": "کمپیوٹر ٹیسٹ",
    "Emergency Repair": "ہنگامی مرمت",

    // Client Dashboard Console
    client_console_title: "سڑک کنارے مدد کنسول",
    client_console_sub: "پاکستان میں کہیں بھی سڑک کنارے مدد حاصل کریں۔ کیش، جیز کیش یا ایزی پیسہ سے ادائیگی کریں۔",
    req_emergency_assistance: "ہنگامی مدد حاصل کریں",
    vehicle_make: "گاڑی بنانے والی کمپنی *",
    select_make: "کمپنی منتخب کریں",
    vehicle_model: "گاڑی کا ماڈل *",
    vehicle_color: "گاڑی کا رنگ",
    breakdown_type: "خرابی کی قسم *",
    service_type: "سروس کی قسم *",
    breakdown_location: "خرابی کا مقام *",
    use_my_location: "میری لوکیشن استعمال کریں",
    locating: "لوکیشن تلاش کی جا رہی ہے...",
    gps_captured: "جی پی ایس لوکیشن محفوظ ہو گئی",
    your_budget: "آپ کا بجٹ (PKR) *",
    payment_method: "ادائیگی کا طریقہ کار *",
    details_notes: "مکینک کے لیے تفصیلات / نوٹس",
    placeholder_landmarks: "وارننگ لائٹس، آوازیں، یا لوکیشن کے قریبی نشانات بتائیں...",
    broadcast_request: "مدد کی درخواست بھیجیں",
    broadcasting: "نشر کیا جا رہی ہے...",
    your_requests: "آپ کی درخواستیں",
    no_requests_yet: "ابھی تک کوئی درخواست نہیں ہے۔ شروع کرنے کے لیے درخواست جمع کریں۔",
    pay_via: "ادائیگی کا طریقہ:",
    live_tracking_map: "لائیو ٹریکنگ نقشہ",
    heading_to_location: "آپ کے مقام پر روانہ...",
    request_summary: "درخواست کا خلاصہ",
    assigned_mechanic: "مقرر کردہ مکینک:",
    waiting_mechanic_accept: "قریبی مکینک کے قبول کرنے کا انتظار ہے...",
    cancel_request: "درخواست منسوخ کریں",
    back_to_dashboard: "نئی مدد کی درخواست کریں",
    mechanic_on_way: "مکینک راستے میں ہے...",
    tow_toyota_workshop: "قریبی ٹویوٹا 3S ورکشاپ پر ٹو کرائیں",
    accident_toggle_label: "گاڑی حادثے / ٹکراؤ کا شکار ہوئی ہے",
    accident_badge: "حادثاتی کیس اور ٹوونگ",
    accident_note: "حادثاتی ٹوونگ گاڑی کو باضابطہ 3S ڈیلرشپ یا آپ کی منتخب کردہ ورکشاپ تک بحفاظت پہنچانے کی سہولت فراہم کرتی ہے۔",
    tow_destination_heading: "ورکشاپ کی منزل منتخب کریں",
    tow_dest_company: "قریبی باضابطہ 3S کمپنی ڈیلرشپ (وارنٹی اور انشورنس کا تحفظ)",
    tow_dest_local: "مقامی ورکشاپ / گیراج",
    tow_dest_custom: "کسٹم ورکشاپ / پتہ (نیچے درج کریں)",
    custom_make_label: "گاڑی کی کمپنی درج کریں *",
    custom_make_placeholder: "گاڑی کی کمپنی کا نام لکھیں (مثلاً Haval, Chery, BAIC, Audi...)",
    custom_issue_label: "خرابی یا مسئلے کی تفصیل لکھیں *",
    custom_issue_placeholder: "گاڑی کے مسئلے یا نقصان کی تفصیل درج کریں...",
    custom_dest_label: "ورکشاپ کا نام اور پتہ *",
    custom_dest_placeholder: "ورکشاپ کا نام، گلی اور شہر درج کریں...",

    // Mechanic Dashboard Console
    mech_console_title: "مکینک ڈسپیچ کنسول",
    mech_console_sub: "پورے پاکستان میں اپنے قریبی کام قبول کریں۔ درخواستیں وصول کرنے کے لیے آن لائن جائیں۔",
    go_online: "آن لائن جائیں",
    go_offline: "آف لائن جائیں",
    verification_pending_title: "اکاؤنٹ کی تصدیق کا عمل: زیرِ غور (شناختی کارڈ کی تصدیق)",
    verification_pending_body: "آٹو ریسکیو سڑک کی حفاظت کے لیے شناختی کارڈ اور پس منظر کی جانچ نافذ کرتا ہے۔ آپ کے دستاویزات کی جانچ کی جا رہی ہے۔ تصدیق مکمل ہونے تک آپ کا اکاؤنٹ ان ویریفائیڈ رہے گا۔",
    offline_title: "آپ آف لائن ہیں",
    offline_sub: "قریبی درخواستیں دیکھنے اور قبول کرنے کے لیے آن لائن جائیں۔",
    no_active_requests_title: "اس وقت کوئی فعال درخواست نہیں ہے۔",
    no_active_requests_sub: "نئی درخواستیں خود بخود یہاں ظاہر ہوں گی۔",
    accept_job: "کام قبول کریں",
    job_history: "کاموں کی تاریخ",
    no_completed_jobs: "ابھی تک کوئی کام مکمل نہیں ہوا۔",
    navigation_routing: "راستہ اور نقشہ",
    heading_to_client: "کلائنٹ کی طرف روانہ!",
    active_job: "فعال کام",
    start_driving: "سفر شروع کریں (راستے میں)",
    driving_to_client: "کلائنٹ کے مقام کی طرف سفر جاری...",
    confirm_arrival: "پہنچنے کی تصدیق کریں",
    start_repair: "مرمت شروع کریں",
    mark_completed: "🛠 کام مکمل مارک کریں",
    back_to_job_board: "📁 جاب بورڈ پر واپس جائیں",
    cancel_job: "کام منسوخ کریں",
    client_brief: "کلائنٹ کی معلومات",
    client_label: "کلائنٹ:",
    phone_label_no_star: "اور فون نمبر:",
    vehicle_label: "گاڑی:",
    payout_label: "اجرت:",
    payment_method_label: "ادائیگی کا طریقہ:",
    client_notes: "کلائنٹ کے نوٹس:",
    distance_label: "فاصلہ:",
    away: "دور",

    // Missing Landing Page Heading
    "From breakdown to back-on-the-road, in four steps": "گاڑی کی خرابی سے سفر کی بحالی تک، صرف 4 مراحل میں",

    // Dropdown Labels
    "Dead Battery": "ڈیڈ بیٹری",
    "Engine Overheat": "انجن گرم ہونا",
    "Key Lockout": "چابی لاک ہونا",
    "Out of Fuel": "پیٹرول ختم ہونا",
    "Brake Problem": "بریک کا مسئلہ",
    "Other Mechanical": "دیگر مکینیکل مسئلہ",
    "On-site Repair": "موقع پر مرمت",
    "Battery Jump Start": "بیٹری جمپ اسٹارٹ",
    "Tire Change": "ٹائر کی تبدیلی",
    "Fuel Delivery": "پیٹرول کی فراہمی",
    "Towing Service": "ٹونگ سروس",
    "Cash on Completion": "کام مکمل ہونے پر کیش",
    "Bank Transfer": "بینک ٹرانسفر",

    // Timeline Steps
    "Sent": "درخواست بھیجی گئی",
    "Claimed": "مکینک مل گیا",
    "En Route": "راستے میں",
    "Arrived": "پہنچ گیا",

    // Request status values
    "PENDING": "زیر التواء",
    "ACCEPTED": "قبول شدہ",
    "EN_ROUTE": "راستے میں",
    "ARRIVED": "پہنچ گیا",
    "IN_PROGRESS": "کام جاری ہے",
    "COMPLETED": "مکمل شدہ",
    "CANCELLED": "منسوخ شدہ",

    // Vehicle Makes
    "Toyota": "ٹویوٹا",
    "Honda": "ہونڈا",
    "Suzuki": "سوزوکی",
    "Hyundai": "ہونڈائی",
    "Kia": "کیا",
    "MG": "ایم جی",
    "Changan": "چنگان",
    "Proton": "پروٹون",
    "Other": "دیگر",

    // Placeholders and e.g. details
    "phone_placeholder": "مثال: 03001234567",
    "otp_placeholder_input": "او ٹی پی لکھیں",
    "phone_placeholder_mechanic": "03xx-xxxxxxx",
    "cnic_placeholder": "35201-1234567-1",
    "verifying": "تصدیق کی جا رہی ہے...",
    "logging_in": "لاگ ان کیا جا رہا ہے...",
    "No additional details provided.": "کوئی اضافی تفصیلات فراہم نہیں کی گئیں۔",
    "Not specified": "بیان نہیں کیا گیا",
    "model_placeholder": "مثال: کرولا، سیوک، آلٹو، کلٹس",
    "color_placeholder": "مثال: سفید، کالا، سلور",
    "location_placeholder": "مثال: شاہراہ فیصل، کراچی یا جی ٹی روڈ، لاہور",
    "budget_placeholder": "مثال: 4000",

    // Specialties
    "Engine Diagnostics": "انجن کمپیوٹر ٹیسٹ",
    "Tire Specialist": "ٹائر پنکچر اور فٹنگ",
    "Electrical Expert": "الیکٹریکل وائرنگ ماہر",
    "Battery Service": "بیٹری چارجنگ و سروس",
    "Brake Mechanic": "بریک مکینک ماہر",

    // Missing chat buttons and payment types
    "message_placeholder": "پیغام لکھیں...",
    "send_btn": "بھیجیں",
    "Cash": "کیش",
    "JazzCash": "جیز کیش",
    "EasyPaisa": "ایزی پیسہ",
    "Budget:": "بجٹ:",
    "Location:": "مقام:",
    "Payment:": "ادائیگی:",
    "Complete Delivery Address": "ڈیلیوری کا پتہ",

    // Cancellation reasons modal
    "cancel_modal_title": "منسوخی کی وجہ",
    "cancel_modal_sub": "برائے مہربانی اس درخواست کو منسوخ کرنے کی وجہ منتخب کریں:",
    "reason_another_solution": "کوئی دوسرا حل مل گیا ہے",
    "reason_too_long": "مکینک بہت زیادہ وقت لے رہا ہے",
    "reason_changed_mind": "میرا ارادہ بدل گیا ہے",
    "reason_wrong_details": "تفصیلات میں غلطی تھی",
    "reason_other": "دیگر",
    "confirm_cancellation_btn": "منسوخی کی تصدیق کریں",
    "other_reason_placeholder": "کوئی اور وجہ بیان کریں...",
    "mechanic_matched_coordinating": "مکینک مل گیا ہے! رابطہ کیا جا رہا ہے...",
    "mechanic_on_way": "مکینک راستے میں ہے...",
    "mechanic_arrived": "مکینک پہنچ چکا ہے!",
    "repair_in_progress": "گاڑی کی مرمت جاری ہے...",

    // Client custom login credentials options
    "phone_email_label": "فون نمبر یا ای میل *",
    "coordination_desk": "لائیو رابطہ چیٹ",
    "chat_with": "{name} کے ساتھ چیٹ",
    "chat_secure_title": "آٹو ریسکیو لائیو کوآرڈینیشن ڈیسک",
    "chat_secure_sub": "تصدیق شدہ مکینک کے ساتھ براہ راست رابطہ۔ گاڑی کی درست لوکیشن، قریبی نشانات یا وقت معلوم کریں۔",
    "quick_messages_label": "⚡ فوری پیغامات (بھیجنے کے لیے کلک کریں):",
    "quick_msg_1": "📍 میں سڑک کے کنارے ایمرجنسی لائٹس جلا کر کھڑا ہوں۔",
    "quick_msg_2": "⏳ آپ کو پہنچنے میں کتنا وقت لگے گا؟",
    "quick_msg_3": "🔑 میرے پاس گاڑی کی چابیاں اور کاغذات تیار ہیں۔",
    "quick_msg_4": "⛽ میں مین پیٹرول پمپ کے قریب کھڑا ہوں۔",
    "chat_secure_sub_mechanic": "کلائنٹ کے ساتھ براہ راست رابطہ۔ اپنا متوقع وقت بتائیں یا گاڑی کی لوکیشن اور نشانی معلوم کریں۔",
    "mech_quick_msg_1": "🚗 میں آپ کی لوکیشن کی طرف نکل چکا ہوں۔ متوقع وقت 10 سے 15 منٹ ہے۔",
    "mech_quick_msg_2": "📍 میں آپ کے پاس پہنچ چکا ہوں۔ برائے مہربانی گاڑی کی لائٹس آن کر لیں۔",
    "mech_quick_msg_3": "📞 میں درست جگہ معلوم کرنے کے لیے آپ کے نمبر پر کال کر رہا ہوں۔",
    "mech_quick_msg_4": "🔧 تمام ضروری اوزار اور سامان گاڑی چیک کرنے کے لیے تیار ہیں۔",
    "request_again": "دوبارہ درخواست کریں",
    "Request Cancelled": "درخواست منسوخ کر دی گئی ہے",
    "This request was cancelled. You can request again with the same vehicle & location details.": "یہ درخواست منسوخ ہو چکی ہے۔ آپ اسی گاڑی اور لوکیشن کے ساتھ دوبارہ درخواست بھیج سکتے ہیں۔",
    "clear_history": "ہسٹری صاف کریں",
    "chat_locked_title": "لائیو چیٹ مقفل ہے",
    "chat_locked_sub": "قریبی مکینک کی جانب سے درخواست قبول کرنے پر براہ راست رابطہ خود بخود کھل جائے گا۔",
    "mech_cancel_job": "کام چھوڑیں / منسوخ کریں",
    "mech_cancel_confirm": "کیا آپ واقعی یہ کام دوسرے مکینکس کے لیے واپس چھوڑنا چاہتے ہیں؟",
    "cannot_cancel_enroute_half": "منسوخی مقفل ہے کیونکہ مکینک آدھے سے زیادہ فاصلہ طے کر چکا ہے۔",
    "client_cancelled_notice": "⚠️ کسٹمر نے یہ درخواست منسوخ کر دی ہے۔",
    "job_released_success": "کام واپس بورڈ پر بھیج دیا گیا ہے۔ آپ اب آن لائن ہیں۔",
    "decline_request": "مسترد کریں",
    "market_estimate_badge": "سرکاری مارکیٹ ریٹ تخمینہ",
    "suggested_price": "تجویز کردہ کرایہ",
    "price_range_note": "اس گاڑی اور خرابی کے لیے معیاری مارکیٹ ریٹ۔",
    "incoming_offers_title": "مکینکس کی پیشکشیں",
    "no_offers_yet": "قریبی مکینکس کو درخواست بھیجی جا رہی ہے... ان کی قیمت کی پیشکش یہاں لائیو ظاہر ہوگی۔",
    "accept_offer_btn": "پیشکش قبول کریں",
    "offer_different_price": "اپنی قیمت پیش کریں",
    "send_counter_offer": "پیشکش بھیجیں",
    "offer_sent_waiting": "پیشکش بھیج دی گئی ہے۔ گاہک کی منظوری کا انتظار ہے...",
    "fair_price_recommendation": "تخمینی قیمت کی حد",
    "custom_offer_placeholder": "اپنی رقم درج کریں (مثلاً 2800)",

    // Mechanic Dispatch Console
    "incoming_requests": "موصول شدہ درخواستیں",
    "job_history": "جاب ہسٹری",
    "offline_title": "آپ اس وقت آف لائن ہیں",
    "offline_sub": "سڑک کنارے نئی نوکریاں موصول کرنے کے لیے آن لائن ہو جائیں۔",
    "no_active_requests_title": "اس وقت کوئی نئی درخواست نہیں ہے۔",
    "no_active_requests_sub": "نئی درخواستیں یہاں خود بخود ظاہر ہوں گی۔",
    "no_completed_jobs": "ابھی تک کوئی کام مکمل نہیں ہوا۔"
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('autorescue-lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('autorescue-lang', language);
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'ur' : 'en'));
  };

  const t = (key) => {
    if (!key) return '';
    if (translations[language] && translations[language][key]) return translations[language][key];
    if (translations['en'] && translations['en'][key]) return translations['en'][key];
    // Automatically convert any unmapped snake_case keys (e.g. incoming_requests) into readable Title Case (e.g. Incoming Requests)
    if (typeof key === 'string' && key.includes('_')) {
      return key
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
