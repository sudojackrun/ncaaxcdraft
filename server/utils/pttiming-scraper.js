import fetch from 'node-fetch';

/**
 * Scrape live results from PTTiming page by directly accessing Firebase
 * @param {string} url - The PTTiming live results URL
 * @returns {Object} - Parsed race data with individual results and team scores
 */
export async function scrapePTTimingResults(url) {
  try {
    console.log(`Fetching live results from: ${url}`);

    // Extract meet ID from URL
    const meetIdMatch = url.match(/mid=(\d+)/);
    if (!meetIdMatch) {
      throw new Error('Could not extract meet ID from URL');
    }

    const meetId = meetIdMatch[1];
    console.log(`Meet ID: ${meetId}`);

    // Fetch directly from Firebase
    const firebaseUrl = `https://ptt-franklin.firebaseio.com/${meetId}.json`;
    console.log(`Fetching Firebase data from: ${firebaseUrl}`);

    const response = await fetch(firebaseUrl);
    if (!response.ok) {
      throw new Error(`Firebase request failed: ${response.status} ${response.statusText}`);
    }

    const fbData = await response.json();

    if (!fbData || typeof fbData !== 'object') {
      throw new Error('Invalid Firebase response');
    }

    console.log('Firebase data keys:', Object.keys(fbData));

    // Initialize race data
    let raceData = {
      raceTitle: 'Live Race Results',
      results: [],
      teamScores: [],
      timestamp: new Date().toISOString()
    };

    // Get meet name from Meta if available
    let meetName = '';
    if (fbData.Meta && fbData.Meta.name) {
      meetName = fbData.Meta.name;
    }

    // Parse MeetEvents
    if (fbData.MeetEvents) {
      console.log('MeetEvents found!');
      const meetEvents = fbData.MeetEvents;
      console.log('MeetEvents keys:', Object.keys(meetEvents));

      const allResults = [];
      const eventNames = [];

      // Process ALL events (multiple races in one meet)
      for (const eventKey of Object.keys(meetEvents)) {
        const event = meetEvents[eventKey];

        if (!event || typeof event !== 'object') continue;

        console.log(`Processing event ${eventKey}...`);

        // Look for ED (Event Data) which contains athlete results
        if (event.ED) {
          const eventData = event.ED;
          console.log(`Found ED with ${Object.keys(eventData).length} entries`);

          // Get event name for title
          let eventName = '';
          if (event.E && event.E.N) {
            eventName = event.E.N;
            eventNames.push(eventName);
          }

          // Parse each athlete entry
          for (const entryKey of Object.keys(eventData)) {
            const entry = eventData[entryKey];

            if (!entry || !entry.A) continue;

            const athlete = entry.A;

            // Extract athlete information
            // N = Full Name, FN = First Name, LN = Last Name
            const fullName = athlete.N || `${athlete.FN || ''} ${athlete.LN || ''}`.trim();

            if (!fullName) continue;

            // Extract place (P = Place)
            const place = entry.P || 0;

            // Extract time (M = Mark/Time, FT = Finish Time)
            const time = entry.M || entry.FT || 'In Progress';

            // Extract school/team (TN = Team Name at entry level)
            const school = entry.TN || athlete.S || athlete.T || '';

            // Extract gender (G = Gender)
            const gender = athlete.G || '';

            // Extract splits if available (SPD = Split Data array)
            const splits = {};
            if (entry.SPD && Array.isArray(entry.SPD)) {
              // Determine split interval based on race distance and number of splits
              const raceDistanceMatch = eventName.match(/(\d+)(k|km|m)/i);
              let raceDistance = null;
              if (raceDistanceMatch) {
                const num = parseInt(raceDistanceMatch[1]);
                const unit = raceDistanceMatch[2].toLowerCase();
                // Convert to meters
                raceDistance = unit === 'm' && num < 100 ? num * 1000 : (unit.startsWith('k') ? num * 1000 : num);
              }

              // Extract splits using lap numbers directly
              // Different races use different split intervals (1K, 2K, or even miles)
              // and PTTiming data quality varies, so we label by lap number
              // to avoid incorrect distance assumptions
              entry.SPD.forEach((splitData, index) => {
                if (splitData && splitData.CS) {
                  // L = Lap number (1, 2, 3...), CS = Cumulative Split time, P = Place
                  const lapNum = splitData.L || (index + 1);
                  const splitName = `Split ${lapNum}`; // Simple "Split 1", "Split 2", etc.

                  splits[splitName] = {
                    time: splitData.CS,        // Cumulative split time
                    place: splitData.P || null // Place at this split
                  };
                }
              });
            }

            allResults.push({
              place: parseInt(place) || 0,
              name: fullName,
              school: school,
              time: time,
              gender: gender,
              eventKey: eventKey,
              eventName: eventName,
              splits: Object.keys(splits).length > 0 ? splits : null
            });
          }

          console.log(`Parsed ${Object.keys(eventData).length} athletes from event ${eventKey} (${eventName})`);
        }
      }

      // Sort all results by place (within their respective events)
      allResults.sort((a, b) => {
        // First sort by event, then by place
        if (a.eventKey !== b.eventKey) {
          return a.eventKey.localeCompare(b.eventKey);
        }
        if (a.place && b.place) return a.place - b.place;
        return 0;
      });

      if (allResults.length > 0) {
        raceData.results = allResults;

        // Build race title from meet name and all event names
        if (meetName && eventNames.length > 0) {
          raceData.raceTitle = `${meetName} - ${eventNames.join(' & ')}`;
        } else if (eventNames.length > 0) {
          raceData.raceTitle = eventNames.join(' & ');
        } else if (meetName) {
          raceData.raceTitle = meetName;
        }

        console.log(`Successfully parsed ${allResults.length} total results from ${eventNames.length} events`);
        console.log(`Race title: ${raceData.raceTitle}`);
        console.log('Sample results:', allResults.slice(0, 3));
      }
    }

    if (raceData.results.length === 0) {
      console.warn('No results found in Firebase data');
    }

    return raceData;

  } catch (error) {
    console.error('Error fetching PTTiming results:', error);
    throw new Error(`Failed to fetch live results: ${error.message}`);
  }
}

/**
 * Normalize a name for matching (remove extra spaces, punctuation, etc.)
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Normalize multiple spaces to single space
    .replace(/[.,\-'`]/g, '')  // Remove punctuation including apostrophes and backticks
    .replace(/\bjr\b|\bsr\b|\biii\b|\bii\b|\biv\b/g, '')  // Remove suffixes
    .replace(/\s+/g, ' ')  // Clean up spaces again after suffix removal
    .trim();
}

/**
 * Normalize school name for matching
 */
function normalizeSchool(school) {
  if (!school) return '';
  return school
    .toLowerCase()
    .trim()
    .replace(/\buniversity\b/g, 'u')
    .replace(/\bcollege\b/g, '')
    .replace(/\bstate\b/g, 'st')
    .replace(/\s+/g, ' ')
    .replace(/[.,\-]/g, '')
    .trim();
}

/**
 * Check if two names match with fuzzy logic
 */
function namesMatch(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Exact match after normalization
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check if last names match (assuming "First Last" format)
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  const lastName1 = parts1[parts1.length - 1];
  const lastName2 = parts2[parts2.length - 1];

  // If last names match and first initial matches
  if (lastName1 === lastName2 && parts1.length > 0 && parts2.length > 0) {
    if (parts1[0][0] === parts2[0][0]) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two schools match
 */
function schoolsMatch(school1, school2) {
  const s1 = normalizeSchool(school1);
  const s2 = normalizeSchool(school2);

  // Exact match
  if (s1 === s2) return true;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Check for common abbreviations
  const words1 = s1.split(' ').filter(w => w.length > 0);
  const words2 = s2.split(' ').filter(w => w.length > 0);

  // If they share significant words
  const sharedWords = words1.filter(w => words2.includes(w));
  if (sharedWords.length >= Math.min(words1.length, words2.length) / 2) {
    return true;
  }

  return false;
}

/**
 * Calculate team scores for draft teams based on live results
 * @param {Array} liveResults - Array of {place, name, school, time}
 * @param {Array} draftTeams - Array of draft teams with their rosters
 * @returns {Array} - Team scores with DNS/DNF handling
 */
export function calculateDraftTeamScores(liveResults, draftTeams) {
  console.log(`\n=== Calculating scores for ${draftTeams.length} teams ===`);
  console.log(`Live results count: ${liveResults.length}`);

  // Determine draft gender by checking all roster athletes
  const allAthletes = draftTeams.flatMap(team => team.roster);
  const genderCounts = { M: 0, F: 0 };
  allAthletes.forEach(athlete => {
    if (athlete.gender) {
      genderCounts[athlete.gender.toUpperCase()] = (genderCounts[athlete.gender.toUpperCase()] || 0) + 1;
    }
  });

  // Determine draft gender: if >80% one gender, filter by that gender's typical races
  const totalWithGender = genderCounts.M + genderCounts.F;
  let draftGender = null;
  if (totalWithGender > 0) {
    if (genderCounts.M / totalWithGender > 0.8) {
      draftGender = 'M';
    } else if (genderCounts.F / totalWithGender > 0.8) {
      draftGender = 'F';
    }
  }

  // Filter live results by appropriate race distances based on gender
  let filteredResults = liveResults;
  if (draftGender === 'M') {
    // Men typically run 8K, 10K, 8000m, 10000m
    filteredResults = liveResults.filter(r => {
      const eventName = (r.eventName || '').toLowerCase();
      return eventName.includes('8000') || eventName.includes('10000') ||
             eventName.includes('8k') || eventName.includes('10k');
    });
    console.log(`Filtered to men's races (8K/10K): ${filteredResults.length} results`);
  } else if (draftGender === 'F') {
    // Women typically run 5K, 6K, 5000m, 6000m
    filteredResults = liveResults.filter(r => {
      const eventName = (r.eventName || '').toLowerCase();
      return eventName.includes('5000') || eventName.includes('6000') ||
             eventName.includes('5k') || eventName.includes('6k');
    });
    console.log(`Filtered to women's races (5K/6K): ${filteredResults.length} results`);
  }

  const teamScores = draftTeams.map(team => {
    const teamResults = [];
    console.log(`\n--- Team: ${team.name} (${team.roster.length} athletes) ---`);

    // Match athletes from live results to draft roster
    team.roster.forEach(athlete => {
      // Try to match by name, school, and gender
      const match = filteredResults.find(result => {
        const nameMatch = namesMatch(result.name, athlete.name);
        const schoolMatch = schoolsMatch(result.school, athlete.school);

        // Check gender match if both have gender data
        let genderMatch = true;
        if (athlete.gender && result.gender) {
          genderMatch = athlete.gender.toLowerCase() === result.gender.toLowerCase();
        }

        // Require name AND school match, plus gender if available
        return nameMatch && schoolMatch && genderMatch;
      });

      if (match) {
        console.log(`  ✓ ${athlete.name}: Place ${match.place}, Time: ${match.time}`);
        teamResults.push({
          athleteName: athlete.name,
          place: match.place,
          time: match.time,
          school: match.school,
          eventName: match.eventName,
          splits: match.splits || null
        });
      } else {
        console.log(`  ✗ ${athlete.name}: NO MATCH`);
      }
    });

    // Sort by place
    teamResults.sort((a, b) => a.place - b.place);

    // Check if team has minimum 5 runners (DNF if not)
    if (teamResults.length < 5) {
      // Determine primary event even for DNF teams
      // If no matches, use the first event from filtered results
      const eventCounts = {};
      teamResults.forEach(r => {
        const event = r.eventName || 'Unknown';
        eventCounts[event] = (eventCounts[event] || 0) + 1;
      });
      let primaryEvent = Object.keys(eventCounts).sort((a, b) => eventCounts[b] - eventCounts[a])[0] || null;

      // If no primary event from matches, use first event from filtered results
      if (!primaryEvent && filteredResults.length > 0) {
        primaryEvent = filteredResults[0].eventName;
      }

      // Get available splits - from matched runners if available, otherwise from all filtered results for the primary event
      const availableSplits = new Set();
      if (teamResults.length > 0) {
        // Use splits from matched runners
        teamResults.forEach(r => {
          if (r.eventName === primaryEvent && r.splits) {
            Object.keys(r.splits).forEach(split => availableSplits.add(split));
          }
        });
      } else if (primaryEvent) {
        // No matched runners - get splits from any runner in the primary event
        filteredResults.forEach(r => {
          if (r.eventName === primaryEvent && r.splits) {
            Object.keys(r.splits).forEach(split => availableSplits.add(split));
          }
        });
      }

      return {
        teamId: team.id,
        teamName: team.name,
        status: 'DNF',
        score: null,
        scoringRunners: teamResults,
        displacers: [],
        reason: `Only ${teamResults.length} runner(s) finished (minimum 5 required)`,
        primaryEvent: primaryEvent,
        availableSplits: Array.from(availableSplits).sort((a, b) => {
          // Extract number from "Split X" format
          const numA = parseInt(a.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.replace(/\D/g, '')) || 0;
          return numA - numB;
        })
      };
    }

    // Calculate score (top 5)
    const scoringRunners = teamResults.slice(0, 5);
    const displacers = teamResults.slice(5, 7);
    const totalScore = scoringRunners.reduce((sum, r) => sum + r.place, 0);

    // Calculate average time (convert MM:SS.s to seconds)
    const timeToSeconds = (timeStr) => {
      if (!timeStr || timeStr === 'In Progress') return null;
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseFloat(parts[1]);
        return minutes * 60 + seconds;
      }
      return null;
    };

    const scoringTimes = scoringRunners.map(r => timeToSeconds(r.time)).filter(t => t !== null);
    const avgTimeSeconds = scoringTimes.length === 5 ? scoringTimes.reduce((sum, t) => sum + t, 0) / 5 : null;
    const avgTime = avgTimeSeconds ? `${Math.floor(avgTimeSeconds / 60)}:${(avgTimeSeconds % 60).toFixed(1).padStart(4, '0')}` : null;

    // Calculate gaps (1st to 5th, 1st to 7th)
    const gap1to5 = scoringRunners.length === 5 ? scoringRunners[4].place - scoringRunners[0].place : null;
    const gap1to7 = displacers.length === 2 ? displacers[1].place - scoringRunners[0].place : null;

    // Calculate split scores if available
    const splitScores = {};
    if (teamResults.some(r => r.splits)) {
      // Get all unique split names
      const allSplitNames = new Set();
      teamResults.forEach(runner => {
        if (runner.splits) {
          Object.keys(runner.splits).forEach(splitName => allSplitNames.add(splitName));
        }
      });

      // For each split, calculate team score
      allSplitNames.forEach(splitName => {
        const runnersWithSplit = teamResults.filter(r => r.splits && r.splits[splitName]);

        // Sort by place at this split
        runnersWithSplit.sort((a, b) => {
          const placeA = a.splits[splitName].place || 999999;
          const placeB = b.splits[splitName].place || 999999;
          return placeA - placeB;
        });

        // Show splits even with < 5 runners
        const top5AtSplit = runnersWithSplit.slice(0, 5);
        const splitScore = runnersWithSplit.length >= 5
          ? top5AtSplit.reduce((sum, r) => sum + (r.splits[splitName].place || 0), 0)
          : null;

        // Calculate avg time at split (only if 5 runners)
        const splitTimes = top5AtSplit.map(r => timeToSeconds(r.splits[splitName].time)).filter(t => t !== null);
        const avgSplitTimeSeconds = splitTimes.length === 5 ? splitTimes.reduce((sum, t) => sum + t, 0) / 5 : null;
        const avgSplitTime = avgSplitTimeSeconds ? `${Math.floor(avgSplitTimeSeconds / 60)}:${(avgSplitTimeSeconds % 60).toFixed(1).padStart(4, '0')}` : null;

        // Calculate gaps at split (only if enough runners)
        const gap1to5Split = top5AtSplit.length >= 5 && top5AtSplit[0].splits[splitName].place && top5AtSplit[4].splits[splitName].place
          ? top5AtSplit[4].splits[splitName].place - top5AtSplit[0].splits[splitName].place
          : null;

        const displacersAtSplit = runnersWithSplit.slice(5, 7);
        const gap1to7Split = displacersAtSplit.length === 2 && top5AtSplit.length >= 5 && top5AtSplit[0].splits[splitName].place && displacersAtSplit[1].splits[splitName].place
          ? displacersAtSplit[1].splits[splitName].place - top5AtSplit[0].splits[splitName].place
          : null;

        splitScores[splitName] = {
          score: splitScore,
          avgTime: avgSplitTime,
          gap1to5: gap1to5Split,
          gap1to7: gap1to7Split,
          runners: top5AtSplit.map(r => ({
            athleteName: r.athleteName,
            place: r.splits[splitName].place,
            time: r.splits[splitName].time
          }))
        };
      });
    }

    // Determine primary event for this team (most common event among matched runners)
    // If no matches, use the first event from filtered results
    const eventCounts = {};
    teamResults.forEach(r => {
      const event = r.eventName || 'Unknown';
      eventCounts[event] = (eventCounts[event] || 0) + 1;
    });
    let primaryEvent = Object.keys(eventCounts).sort((a, b) => eventCounts[b] - eventCounts[a])[0] || null;

    // If no primary event from matches, use first event from filtered results
    if (!primaryEvent && filteredResults.length > 0) {
      primaryEvent = filteredResults[0].eventName;
    }

    // Get available splits - from matched runners if available, otherwise from all filtered results for the primary event
    const availableSplits = new Set();
    if (teamResults.length > 0) {
      // Use splits from matched runners
      teamResults.forEach(r => {
        if (r.eventName === primaryEvent && r.splits) {
          Object.keys(r.splits).forEach(split => availableSplits.add(split));
        }
      });
    } else if (primaryEvent) {
      // No matched runners - get splits from any runner in the primary event
      filteredResults.forEach(r => {
        if (r.eventName === primaryEvent && r.splits) {
          Object.keys(r.splits).forEach(split => availableSplits.add(split));
        }
      });
    }

    return {
      teamId: team.id,
      teamName: team.name,
      status: 'SCORED',
      score: totalScore,
      avgTime: avgTime,
      gap1to5: gap1to5,
      gap1to7: gap1to7,
      scoringRunners,
      displacers,
      totalFinishers: teamResults.length,
      splitScores: Object.keys(splitScores).length > 0 ? splitScores : null,
      primaryEvent: primaryEvent, // e.g., "8000m", "6000m"
      availableSplits: Array.from(availableSplits).sort((a, b) => {
        // Extract number from "Split X" format
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      }) // e.g., ["1K", "2K", "3K", "4K"]
    };
  });

  // Sort by score (lowest wins), DNF teams go to bottom
  teamScores.sort((a, b) => {
    if (a.status === 'DNF' && b.status !== 'DNF') return 1;
    if (a.status !== 'DNF' && b.status === 'DNF') return -1;
    if (a.status === 'DNF' && b.status === 'DNF') return 0;
    return a.score - b.score;
  });

  return teamScores;
}
