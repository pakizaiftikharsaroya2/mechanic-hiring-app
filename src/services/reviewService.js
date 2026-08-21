import { syncCloudRequest, fetchAllCloudRequests } from '../lib/cloudSync';

/** Dedicated persistent reviews store */
export function getPersistentReviews(mechanicId) {
  try {
    const all = JSON.parse(localStorage.getItem('mock_mechanic_reviews_store') || '{}');
    const localReqs = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    
    // Extract reviews from service requests
    const reqReviews = localReqs
      .filter(r => (String(r.mechanic_id) === String(mechanicId) || !r.mechanic_id || !mechanicId) && r.client_rating)
      .map(r => ({
        rating: Number(r.client_rating),
        comment: r.client_review || 'Great service and quick repair!',
        client_name: r.client_name || 'Verified Client',
        tip: Number(r.tip_amount) || 0,
        date: r.reviewed_at || r.updated_at || new Date().toISOString()
      }));

    const directList = mechanicId ? (all[String(mechanicId)] || []) : [];
    const fallbackList = all['mechanic_muhammad'] || all['usr_sarah'] || all['usr_marcus'] || [];

    const combined = [...directList, ...reqReviews, ...fallbackList];
    const unique = [];
    const seen = new Set();
    for (const rev of combined) {
      const key = `${rev.rating}-${rev.comment}-${rev.client_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rev);
      }
    }
    return unique;
  } catch (e) {
    return [];
  }
}

/** Async loader that pulls cross-device reviews from cloud sync */
export async function getPersistentReviewsAsync(mechanicId) {
  try {
    const localReviews = getPersistentReviews(mechanicId);
    const cloudRequests = await fetchAllCloudRequests();
    
    const cloudReviews = (cloudRequests || [])
      .filter(r => (String(r.mechanic_id) === String(mechanicId) || !r.mechanic_id || !mechanicId) && r.client_rating)
      .map(r => ({
        rating: Number(r.client_rating),
        comment: r.client_review || 'Great service and fast response!',
        client_name: r.client_name || 'Verified Client',
        tip: Number(r.tip_amount) || 0,
        date: r.reviewed_at || r.updated_at || new Date().toISOString()
      }));

    const combined = [...localReviews, ...cloudReviews];
    const unique = [];
    const seen = new Set();
    for (const rev of combined) {
      const key = `${rev.rating}-${rev.comment}-${rev.client_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rev);
      }
    }
    return unique;
  } catch (e) {
    return getPersistentReviews(mechanicId);
  }
}

export function savePersistentReview(mechanicId, reviewItem) {
  try {
    const targetKey = String(mechanicId || 'mechanic_muhammad');
    const all = JSON.parse(localStorage.getItem('mock_mechanic_reviews_store') || '{}');
    const list = all[targetKey] || [];
    if (!list.some(r => r.comment === reviewItem.comment && r.rating === reviewItem.rating)) {
      list.unshift(reviewItem);
    }
    all[targetKey] = list;
    localStorage.setItem('mock_mechanic_reviews_store', JSON.stringify(all));
  } catch (e) {}
}

/**
 * Submit client rating & review for a completed service request.
 * Computes the mechanic's aggregate rating and permanently stores & syncs it.
 */
export async function submitRequestReview({ requestId, mechanicId, rating, comment, tip = 0, clientName = 'Verified Client' }) {
  const localRequests = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  const reqIdx = localRequests.findIndex(r => String(r.id) === String(requestId));
  
  let targetMechanicId = mechanicId;
  let updatedReq = null;

  if (reqIdx >= 0) {
    const current = localRequests[reqIdx];
    targetMechanicId = targetMechanicId || current.mechanic_id;
    updatedReq = {
      ...current,
      client_rating: Number(rating) || 5,
      client_review: comment || 'Excellent service!',
      tip_amount: Number(tip) || 0,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    localRequests[reqIdx] = updatedReq;
    localStorage.setItem('mock_service_requests', JSON.stringify(localRequests));
    await syncCloudRequest(updatedReq);
  }

  const effectiveMechId = targetMechanicId || 'mechanic_muhammad';

  const newReviewItem = {
    rating: Number(rating) || 5,
    comment: comment || 'Excellent service and quick repair!',
    client_name: clientName,
    tip: Number(tip) || 0,
    date: new Date().toISOString()
  };

  // Permanently save to isolated reviews store
  savePersistentReview(effectiveMechId, newReviewItem);

  // Compute aggregate rating
  const reviewsForMech = getPersistentReviews(effectiveMechId);
  const totalReviews = reviewsForMech.length;
  const sumRatings = reviewsForMech.reduce((sum, r) => sum + Number(r.rating || 5), 0);
  const avgRating = totalReviews > 0 ? (sumRatings / totalReviews).toFixed(1) : Number(rating).toFixed(1);

  // Save to mechanic profiles cache
  const profiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
  const pIdx = profiles.findIndex(p => String(p.user_id) === String(effectiveMechId));
  const mechData = {
    user_id: effectiveMechId,
    rating: avgRating,
    review_count: totalReviews,
    reviews: reviewsForMech
  };

  if (pIdx >= 0) {
    profiles[pIdx] = { ...profiles[pIdx], ...mechData };
  } else {
    profiles.push(mechData);
  }
  localStorage.setItem('mock_mechanic_profiles', JSON.stringify(profiles));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }

  return { avgRating, totalReviews, reviews: reviewsForMech };
}

/** Fetch all reviews and computed rating for a mechanic */
export function getMechanicRatingSummary(mechanicId) {
  const effectiveId = mechanicId || 'mechanic_muhammad';
  try {
    const list = getPersistentReviews(effectiveId);
    if (list && list.length > 0) {
      const sum = list.reduce((acc, curr) => acc + Number(curr.rating || 5), 0);
      const avg = (sum / list.length).toFixed(1);
      return {
        rating: avg,
        review_count: list.length,
        reviews: list
      };
    }
  } catch (e) {}

  return { rating: 'New', review_count: 0, reviews: [] };
}
