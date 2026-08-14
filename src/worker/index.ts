import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  getCurrentUser,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
});

// Authentication endpoints
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.code) {
      console.error('[AUTH] No authorization code provided');
      return c.json({ error: "No authorization code provided" }, 400);
    }

    console.log('[AUTH] Exchanging code for session token...');
    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    console.log('[AUTH] Session token obtained successfully');
    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('[AUTH] Error in /api/sessions:', error);
    return c.json({ 
      error: "Error al completar el inicio de sesión. Por favor, intenta nuevamente.",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

app.get("/api/users/me", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (!sessionToken) {
    return c.json({ user: null }, 200);
  }

  try {
    const user = await getCurrentUser(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    // Auto-create user record in database if they don't exist
    if (user) {
      const db = c.env.DB;
      const existingUser = await db.prepare("SELECT id, email FROM users WHERE mocha_user_id = ?").bind(user.id).first() as any;
      
      if (!existingUser) {
        console.log('[API] /api/users/me - Creating new user:', user.id, user.email);
        // New users get "Gratis" plan (no expiry)
        
        await db.prepare(`
          INSERT INTO users (mocha_user_id, tipo_plan, email, billing_period, plan_expiry_date) 
          VALUES (?, ?, ?, ?, ?)
        `).bind(user.id, 'Gratis', user.email || null, null, null).run();
        console.log('[API] /api/users/me - User created successfully with Gratis plan');
      } else if (!existingUser.email && user.email) {
        // Update email if missing
        await db.prepare("UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(user.email, existingUser.id).run();
        console.log('[API] /api/users/me - Updated email for user:', existingUser.id);
      }
    }

    return c.json({ user }, 200);
  } catch (error) {
    console.error('[API] /api/users/me - Error:', error);
    return c.json({ user: null }, 200);
  }
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Get all rabbits (protected)
app.get("/api/rabbits", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const rabbits = await db.prepare(`
    SELECT 
      r.*,
      pm.name as parent_male_name,
      pf.name as parent_female_name
    FROM rabbits r
    LEFT JOIN rabbits pm ON r.parent_male_id = pm.id
    LEFT JOIN rabbits pf ON r.parent_female_id = pf.id
    WHERE r.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    ORDER BY r.created_at DESC
  `).bind(mochaUser.id).all();
  return c.json(rabbits.results);
});

// Get single rabbit (protected)
app.get("/api/rabbits/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const rabbit = await db.prepare(`
    SELECT 
      r.*,
      pm.name as parent_male_name,
      pf.name as parent_female_name
    FROM rabbits r
    LEFT JOIN rabbits pm ON r.parent_male_id = pm.id
    LEFT JOIN rabbits pf ON r.parent_female_id = pf.id
    WHERE r.id = ? AND r.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!rabbit) {
    return c.json({ error: "Conejo no encontrado" }, 404);
  }
  
  // Get siblings if this rabbit has a litter_id (only from same user)
  if (rabbit.litter_id) {
    const siblings = await db.prepare(`
      SELECT id, name, ear_tag, sex 
      FROM rabbits 
      WHERE litter_id = ? AND id != ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    `).bind(rabbit.litter_id, id, mochaUser.id).all();
    rabbit.siblings = siblings.results;
  }
  
  return c.json(rabbit);
});

// Create rabbit
app.post("/api/rabbits", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const mochaUser = c.get("user");
    
    if (!mochaUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    console.log('[API] Creating rabbit for user:', mochaUser.id, mochaUser.email);
    
    // Get or create user record using helper function
    const user = await getOrCreateUser(db, mochaUser);
    
    if (!user) {
      console.error('[API] Failed to get or create user in /api/rabbits');
      return c.json({ error: "No se pudo crear el perfil de usuario. Por favor, intenta cerrar sesión e iniciar sesión nuevamente." }, 500);
    }
    
    console.log('[API] User record found/created, checking plan limits');
    
    // Check plan limits for Básico users
    if (user.tipo_plan === 'Básico') {
      const count = await db.prepare("SELECT COUNT(*) as count FROM rabbits WHERE user_id = ?").bind(user.id).first() as any;
      
      if (count && (count.count as number) >= 50) {
        return c.json({ 
          error: 'Límite alcanzado. Pásate al plan Ilimitado para registrar más de 50 conejos',
          limitReached: true 
        }, 400);
      }
    }
    
    // Check plan limits for Prueba users
    if (user.tipo_plan === 'Prueba') {
      const count = await db.prepare("SELECT COUNT(*) as count FROM rabbits WHERE user_id = ?").bind(user.id).first() as any;
      
      if (count && (count.count as number) >= 10) {
        return c.json({ 
          error: 'Límite alcanzado. Pásate al plan Básico o Ilimitado para registrar más de 10 conejos',
          limitReached: true 
        }, 400);
      }
    }
    
    console.log('[API] Inserting rabbit into database');
    const result = await db.prepare(`
      INSERT INTO rabbits (name, ear_tag, sex, breed, birth_date, weight, color, status, notes, user_id, parent_male_id, parent_female_id, left_ear_tattoo, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name,
      body.ear_tag,
      body.sex,
      body.breed,
      body.birth_date,
      body.weight || null,
      body.color || '',
      body.status || 'active',
      body.notes || null,
      user.id,
      body.parent_male_id || null,
      body.parent_female_id || null,
      body.left_ear_tattoo || null,
      body.photo_url || null
    ).run();
    
    console.log('[API] Rabbit created with ID:', result.meta.last_row_id);
    const newRabbit = await db.prepare("SELECT * FROM rabbits WHERE id = ?").bind(result.meta.last_row_id).first();
    return c.json(newRabbit, 201);
  } catch (error) {
    console.error('[API] Error creating rabbit:', error);
    return c.json({ 
      error: "Error al crear el conejo. Por favor, intenta nuevamente.",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Update rabbit (protected)
app.put("/api/rabbits/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify rabbit belongs to user
  const existingRabbit = await db.prepare(`
    SELECT id FROM rabbits WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!existingRabbit) {
    return c.json({ error: "Conejo no encontrado" }, 404);
  }
  
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];
  
  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.ear_tag !== undefined) {
    updates.push('ear_tag = ?');
    values.push(body.ear_tag);
  }
  if (body.sex !== undefined) {
    updates.push('sex = ?');
    values.push(body.sex);
  }
  if (body.breed !== undefined) {
    updates.push('breed = ?');
    values.push(body.breed);
  }
  if (body.birth_date !== undefined) {
    updates.push('birth_date = ?');
    values.push(body.birth_date);
  }
  if (body.weight !== undefined) {
    updates.push('weight = ?');
    values.push(body.weight || null);
  }
  if (body.color !== undefined) {
    updates.push('color = ?');
    values.push(body.color);
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?');
    values.push(body.notes || null);
  }
  if (body.parent_male_id !== undefined) {
    updates.push('parent_male_id = ?');
    values.push(body.parent_male_id || null);
  }
  if (body.parent_female_id !== undefined) {
    updates.push('parent_female_id = ?');
    values.push(body.parent_female_id || null);
  }
  if (body.sold_to !== undefined) {
    updates.push('sold_to = ?');
    values.push(body.sold_to || null);
  }
  if (body.sold_date !== undefined) {
    updates.push('sold_date = ?');
    values.push(body.sold_date || null);
  }
  if (body.sale_price !== undefined) {
    updates.push('sale_price = ?');
    values.push(body.sale_price || null);
  }
  if (body.photo_url !== undefined) {
    updates.push('photo_url = ?');
    values.push(body.photo_url || null);
  }
  if (body.left_ear_tattoo !== undefined) {
    updates.push('left_ear_tattoo = ?');
    values.push(body.left_ear_tattoo || null);
  }
  
  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const sql = `UPDATE rabbits SET ${updates.join(', ')} WHERE id = ?`;
  await db.prepare(sql).bind(...values).run();
  
  const updatedRabbit = await db.prepare("SELECT * FROM rabbits WHERE id = ?").bind(id).first();
  return c.json(updatedRabbit);
});

// Delete rabbit (protected)
app.delete("/api/rabbits/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Only delete if rabbit belongs to user
  await db.prepare(`
    DELETE FROM rabbits WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).run();
  return c.json({ success: true });
});

// Get all custom breeds (protected)
app.get("/api/custom-breeds", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const customBreeds = await db.prepare(`
    SELECT * FROM custom_breeds 
    WHERE user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    ORDER BY breed_name ASC
  `).bind(mochaUser.id).all();
  
  return c.json(customBreeds.results);
});

// Create custom breed (protected)
app.post("/api/custom-breeds", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const mochaUser = c.get("user");
    
    if (!mochaUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { breed_name } = body;
    
    if (!breed_name || breed_name.trim() === '') {
      return c.json({ error: "El nombre de la raza es requerido" }, 400);
    }
    
    // Get user id
    const user = await db.prepare("SELECT id FROM users WHERE mocha_user_id = ?").bind(mochaUser.id).first() as any;
    
    if (!user) {
      return c.json({ error: "Usuario no encontrado" }, 404);
    }
    
    // Check if breed already exists for this user
    const existing = await db.prepare(`
      SELECT id FROM custom_breeds WHERE user_id = ? AND breed_name = ?
    `).bind(user.id, breed_name.trim()).first();
    
    if (existing) {
      return c.json({ error: "Esta raza ya existe" }, 400);
    }
    
    // Create custom breed
    const result = await db.prepare(`
      INSERT INTO custom_breeds (user_id, breed_name, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(user.id, breed_name.trim()).run();
    
    const newBreed = {
      id: result.meta.last_row_id,
      user_id: user.id,
      breed_name: breed_name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return c.json(newBreed, 201);
  } catch (error) {
    console.error('[API] Error creating custom breed:', error);
    return c.json({ error: "Error al crear la raza personalizada" }, 500);
  }
});

// Delete custom breed (protected)
app.delete("/api/custom-breeds/:id", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    const mochaUser = c.get("user");
    
    if (!mochaUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Verify breed belongs to user
    const existingBreed = await db.prepare(`
      SELECT id FROM custom_breeds 
      WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    `).bind(id, mochaUser.id).first();
    
    if (!existingBreed) {
      return c.json({ error: "Raza no encontrada" }, 404);
    }
    
    // Delete breed
    await db.prepare("DELETE FROM custom_breeds WHERE id = ?").bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting custom breed:', error);
    return c.json({ error: "Error al eliminar la raza" }, 500);
  }
});

// Get all breedings (protected)
app.get("/api/breedings", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const breedings = await db.prepare(`
    SELECT 
      b.*,
      m.name as male_name,
      m.ear_tag as male_ear_tag,
      f.name as female_name,
      f.ear_tag as female_ear_tag
    FROM breedings b
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE b.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    ORDER BY b.breeding_date DESC
  `).bind(mochaUser.id).all();
  return c.json(breedings.results);
});

// Get single breeding (protected)
app.get("/api/breedings/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const breeding = await db.prepare(`
    SELECT 
      b.*,
      m.name as male_name,
      m.ear_tag as male_ear_tag,
      f.name as female_name,
      f.ear_tag as female_ear_tag
    FROM breedings b
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE b.id = ? AND b.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!breeding) {
    return c.json({ error: "Cruce no encontrado" }, 404);
  }
  
  return c.json(breeding);
});

// Create breeding (protected)
app.post("/api/breedings", authMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  if (!user) {
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  // Calculate expected birth date (31 days from breeding)
  // Parse date as local date to avoid timezone issues
  const [year, month, day] = body.breeding_date.split('-').map(Number);
  const breedingDate = new Date(year, month - 1, day);
  const expectedBirthDate = new Date(breedingDate);
  expectedBirthDate.setDate(expectedBirthDate.getDate() + 31);
  
  // Format back to YYYY-MM-DD
  const expectedYear = expectedBirthDate.getFullYear();
  const expectedMonth = String(expectedBirthDate.getMonth() + 1).padStart(2, '0');
  const expectedDay = String(expectedBirthDate.getDate()).padStart(2, '0');
  
  const result = await db.prepare(`
    INSERT INTO breedings (male_id, female_id, breeding_date, expected_birth_date, status, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.male_id,
    body.female_id,
    body.breeding_date,
    `${expectedYear}-${expectedMonth}-${expectedDay}`,
    'pending',
    body.notes || null,
    user.id
  ).run();
  
  // Update female status to pregnant
  await db.prepare("UPDATE rabbits SET status = 'pregnant' WHERE id = ?").bind(body.female_id).run();
  
  const newBreeding = await db.prepare(`
    SELECT 
      b.*,
      m.name as male_name,
      m.ear_tag as male_ear_tag,
      f.name as female_name,
      f.ear_tag as female_ear_tag
    FROM breedings b
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE b.id = ?
  `).bind(result.meta.last_row_id).first();
  
  return c.json(newBreeding, 201);
});

// Update breeding (protected)
app.put("/api/breedings/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  await db.prepare(`
    UPDATE breedings 
    SET male_id = ?, female_id = ?, breeding_date = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(
    body.male_id,
    body.female_id,
    body.breeding_date,
    body.status,
    body.notes || null,
    id,
    mochaUser.id
  ).run();
  
  const updatedBreeding = await db.prepare(`
    SELECT 
      b.*,
      m.name as male_name,
      m.ear_tag as male_ear_tag,
      f.name as female_name,
      f.ear_tag as female_ear_tag
    FROM breedings b
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE b.id = ?
  `).bind(id).first();
  
  return c.json(updatedBreeding);
});

// Delete breeding (protected)
app.delete("/api/breedings/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Get the breeding to update the female's status if needed (only if owned by user)
  const breeding = await db.prepare(`
    SELECT female_id, status FROM breedings 
    WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!breeding) {
    return c.json({ error: "Cruce no encontrado" }, 404);
  }
  
  if (breeding.status === 'pending') {
    // Update female status back to active if breeding was pending
    await db.prepare("UPDATE rabbits SET status = 'active' WHERE id = ?").bind(breeding.female_id).run();
  }
  
  await db.prepare(`
    DELETE FROM breedings WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).run();
  return c.json({ success: true });
});

// Get all litters (protected)
app.get("/api/litters", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const litters = await db.prepare(`
    SELECT 
      l.*,
      m.name as male_name,
      f.name as female_name
    FROM litters l
    LEFT JOIN breedings b ON l.breeding_id = b.id
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE l.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    ORDER BY l.birth_date DESC
  `).bind(mochaUser.id).all();
  return c.json(litters.results);
});

// Generate tattoo preview for litter
app.post("/api/litters/preview-tattoos", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const body = await c.req.json();
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  if (!user) {
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  const { birth_date, alive_kits } = body;
  
  // Get ranch initials for right ear tattoo
  const ranchInitials = user.ranch_initials || '';
  
  // Generate left ear tattoo codes
  // Parse date as local date to avoid timezone issues
  const [year, month, day] = birth_date.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const yearDigit = birthDate.getFullYear() % 10; // Last digit of year
  const monthStr = String(birthDate.getMonth() + 1).padStart(2, '0'); // Month 01-12
  
  // Find the next available sequential number for this month/year
  const prefix = `${yearDigit}${monthStr}`;
  
  // Get all existing tattoos that match this prefix from user's rabbits
  const existingTattoos = await db.prepare(
    `SELECT left_ear_tattoo FROM rabbits 
     WHERE user_id = ? AND left_ear_tattoo LIKE ?
     ORDER BY left_ear_tattoo DESC`
  ).bind(user.id, `${prefix}%`).all();
  
  // Find the highest sequential number
  let nextSequential = 1;
  if (existingTattoos.results.length > 0) {
    const lastTattoo = existingTattoos.results[0].left_ear_tattoo as string;
    if (lastTattoo && lastTattoo.length === 5) {
      const lastNumber = parseInt(lastTattoo.substring(3));
      if (!isNaN(lastNumber)) {
        nextSequential = lastNumber + 1;
      }
    }
  }
  
  // Generate tattoo codes for each kit
  const tattoos = [];
  for (let i = 0; i < alive_kits; i++) {
    const sequential = String(nextSequential + i).padStart(2, '0');
    tattoos.push({
      left_ear: `${prefix}${sequential}`,
      right_ear: ranchInitials,
    });
  }
  
  return c.json({
    tattoos,
    ranch_initials: ranchInitials,
    has_ranch_config: !!ranchInitials,
  });
});

// Create litter (protected)
app.post("/api/litters", authMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  if (!user) {
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  // Check if user wants unique tattoos (defaults to false)
  const useUniqueTattoos = body.use_unique_tattoos === true;
  
  const result = await db.prepare(`
    INSERT INTO litters (breeding_id, birth_date, total_kits, alive_kits, dead_kits, weaning_date, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.breeding_id,
    body.birth_date,
    body.total_kits,
    body.alive_kits,
    body.dead_kits || 0,
    body.weaning_date || null,
    body.notes || null,
    user.id
  ).run();
  
  const litterId = result.meta.last_row_id;
  
  // Update breeding status
  await db.prepare(`
    UPDATE breedings 
    SET status = 'completed', actual_birth_date = ?
    WHERE id = ?
  `).bind(body.birth_date, body.breeding_id).run();
  
  // Get breeding info to create kits
  const breeding = await db.prepare(`
    SELECT b.*, m.name as male_name, m.breed as male_breed, m.user_id as user_id, f.name as female_name, f.breed as female_breed
    FROM breedings b
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE b.id = ?
  `).bind(body.breeding_id).first() as any;
  
  if (breeding) {
    // Update female status back to active
    await db.prepare("UPDATE rabbits SET status = 'active' WHERE id = ?").bind(breeding.female_id).run();
    
    let litterID = null;
    
    // Only generate unique IDs if user wants them
    if (useUniqueTattoos) {
      // Get ranch initials (max 3 characters)
      const ranchInitials = (user.ranch_initials || '').substring(0, 3).toUpperCase();
      
      if (ranchInitials) {
        // Find the highest sequential number used with these ranch initials
        const existingIDs = await db.prepare(
          `SELECT left_ear_tattoo FROM rabbits 
           WHERE user_id = ? AND left_ear_tattoo LIKE ?
           ORDER BY CAST(SUBSTR(left_ear_tattoo, LENGTH(?) + 1) AS INTEGER) DESC
           LIMIT 1`
        ).bind(user.id, `${ranchInitials}%`, ranchInitials).first() as any;
        
        let nextSequential = 1;
        if (existingIDs && existingIDs.left_ear_tattoo) {
          const lastID = existingIDs.left_ear_tattoo as string;
          // Extract the number part after the ranch initials
          const numberPart = lastID.substring(ranchInitials.length);
          const lastNumber = parseInt(numberPart);
          if (!isNaN(lastNumber)) {
            nextSequential = lastNumber + 1;
          }
        }
        
        // Generate the litter ID (same for all kits in this litter)
        litterID = `${ranchInitials}${String(nextSequential).padStart(3, '0')}`;
      }
    }
    
    // Create individual rabbit records for each alive kit
    for (let i = 1; i <= body.alive_kits; i++) {
      const kitName = `${breeding.female_name} - Gazapo ${i}`;
      const earTag = `${breeding.female_id}-${litterId}-${i}`;
      
      await db.prepare(`
        INSERT INTO rabbits (
          name, ear_tag, sex, breed, birth_date, color, status, notes,
          litter_id, parent_male_id, parent_female_id, user_id,
          left_ear_tattoo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        kitName,
        earTag,
        'female', // Default to female, can be updated later
        breeding.male_breed || breeding.female_breed,
        body.birth_date,
        'Por determinar',
        'active',
        `Camada de ${breeding.female_name} × ${breeding.male_name}`,
        litterId,
        breeding.male_id,
        breeding.female_id,
        breeding.user_id,
        litterID
      ).run();
    }
  }
  
  const newLitter = await db.prepare(`
    SELECT 
      l.*,
      m.name as male_name,
      f.name as female_name
    FROM litters l
    LEFT JOIN breedings b ON l.breeding_id = b.id
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE l.id = ?
  `).bind(litterId).first();
  
  return c.json(newLitter, 201);
});

// Get single litter (protected)
app.get("/api/litters/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const litter = await db.prepare(`
    SELECT 
      l.*,
      m.name as male_name,
      f.name as female_name
    FROM litters l
    LEFT JOIN breedings b ON l.breeding_id = b.id
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE l.id = ? AND l.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!litter) {
    return c.json({ error: "Camada no encontrada" }, 404);
  }
  
  return c.json(litter);
});

// Update litter (protected)
app.put("/api/litters/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  await db.prepare(`
    UPDATE litters 
    SET breeding_id = ?, birth_date = ?, total_kits = ?, alive_kits = ?, 
        dead_kits = ?, weaning_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(
    body.breeding_id,
    body.birth_date,
    body.total_kits,
    body.alive_kits,
    body.dead_kits || 0,
    body.weaning_date || null,
    body.notes || null,
    id,
    mochaUser.id
  ).run();
  
  const updatedLitter = await db.prepare(`
    SELECT 
      l.*,
      m.name as male_name,
      f.name as female_name
    FROM litters l
    LEFT JOIN breedings b ON l.breeding_id = b.id
    LEFT JOIN rabbits m ON b.male_id = m.id
    LEFT JOIN rabbits f ON b.female_id = f.id
    WHERE l.id = ?
  `).bind(id).first();
  
  return c.json(updatedLitter);
});

// Delete litter (protected)
app.delete("/api/litters/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify litter belongs to user
  const litter = await db.prepare(`
    SELECT id FROM litters WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!litter) {
    return c.json({ error: "Camada no encontrada" }, 404);
  }
  
  // Delete associated kits first (only user's kits)
  await db.prepare(`
    DELETE FROM rabbits WHERE litter_id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).run();
  
  await db.prepare(`
    DELETE FROM litters WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).run();
  return c.json({ success: true });
});

// Helper function to get or create user
async function getOrCreateUser(db: D1Database, mochaUser: any) {
  try {
    // First, try to find existing user
    let user = await db.prepare("SELECT * FROM users WHERE mocha_user_id = ?").bind(mochaUser.id).first() as any;
    
    if (user) {
      // Update email if not set
      if (!user.email && mochaUser.email) {
        await db.prepare("UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(mochaUser.email, user.id).run();
        user.email = mochaUser.email;
      }
      console.log('[API] Found existing user:', user.id, user.email, 'Plan:', user.tipo_plan);
      return user;
    }
    
    // Auto-create user if they don't exist with Prueba plan (1 month free trial)
    console.log('[API] Creating new user via getOrCreateUser:', mochaUser.id, mochaUser.email);
    const today = new Date();
    const expiryDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const expiryDateStr = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`;
    
    const result = await db.prepare(`
      INSERT INTO users (mocha_user_id, tipo_plan, email, plan_expiry_date, billing_period) 
      VALUES (?, ?, ?, ?, ?)
    `).bind(mochaUser.id, 'Prueba', mochaUser.email || null, expiryDateStr, 'monthly').run();
    
    // Return the newly created user
    user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(result.meta.last_row_id).first();
    console.log('[API] User created with Prueba plan (1 month free trial), ID:', user?.id);
    return user;
  } catch (error) {
    console.error('[API] Error in getOrCreateUser:', error);
    return null;
  }
}

// Complete user registration
app.post("/api/users/complete-registration", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const body = await c.req.json();
  
  if (!mochaUser) {
    console.log('[API] /api/users/complete-registration - No mocha user');
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  if (!body.name || !body.name.trim()) {
    return c.json({ error: "El nombre es obligatorio" }, 400);
  }
  
  console.log('[API] /api/users/complete-registration - User:', mochaUser.id, mochaUser.email, 'Name:', body.name);
  
  // Check if user already exists
  let user = await db.prepare("SELECT * FROM users WHERE mocha_user_id = ?").bind(mochaUser.id).first() as any;
  
  if (!user) {
    // Create new user with registration data
    console.log('[API] /api/users/complete-registration - Creating NEW user in database');
    const result = await db.prepare(`
      INSERT INTO users (mocha_user_id, tipo_plan, email, name, phone, location) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      mochaUser.id, 
      'Básico', 
      mochaUser.email || null,
      body.name,
      body.phone || null,
      body.location || null
    ).run();
    console.log('[API] /api/users/complete-registration - User CREATED with ID:', result.meta.last_row_id);
  } else {
    // Update existing user with registration data
    console.log('[API] /api/users/complete-registration - Updating existing user:', user.id);
    await db.prepare(`
      UPDATE users 
      SET name = ?, phone = ?, location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.name,
      body.phone || null,
      body.location || null,
      user.id
    ).run();
  }
  
  return c.json({ success: true });
});

// Get user plan info
app.get("/api/users/plan", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  
  if (!user) {
    return c.json({ error: "Failed to create user" }, 500);
  }
  
  // Check if plan has expired and update if needed
  let currentPlan = user.tipo_plan;
  let isActive = true;
  
  if (user.plan_expiry_date) {
    const [expiryYear, expiryMonth, expiryDay] = user.plan_expiry_date.split('-').map(Number);
    const expiryDate = new Date(expiryYear, expiryMonth - 1, expiryDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If plan has expired, downgrade to Gratis
    if (today > expiryDate) {
      await db.prepare("UPDATE users SET tipo_plan = 'Gratis', plan_expiry_date = NULL, billing_period = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id).run();
      currentPlan = 'Gratis';
      isActive = false;
    }
  }
  
  const rabbitCount = await db.prepare("SELECT COUNT(*) as count FROM rabbits WHERE user_id = ?").bind(user.id).first() as any;
  
  // Determine rabbit limit based on plan
  let limit: number | null = null;
  if (currentPlan === 'Gratis') {
    limit = 10;
  }
  // Ilimitado has no limit (null)
  
  return c.json({
    tipo_plan: currentPlan,
    rabbit_count: rabbitCount?.count || 0,
    limit: limit,
    is_admin: mochaUser.email === 'saikopr1@gmail.com',
    plan_expiry_date: user.plan_expiry_date,
    billing_period: user.billing_period,
    is_active: isActive,
  });
});

// Get user profile
app.get("/api/users/profile", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    console.log('[API] /api/users/profile - No mocha user found');
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  console.log('[API] /api/users/profile - Getting profile for:', mochaUser.id, mochaUser.email);
  const user = await getOrCreateUser(db, mochaUser);
  
  if (!user) {
    console.error('[API] /api/users/profile - Failed to get or create user');
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  console.log('[API] /api/users/profile - Returning profile for user ID:', user.id);
  return c.json({
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    ranch_name: user.ranch_name,
    ranch_initials: user.ranch_initials,
  });
});

// Update user profile
app.put("/api/users/profile", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const body = await c.req.json();
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  
  if (!user) {
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  await db.prepare(`
    UPDATE users 
    SET name = ?, phone = ?, location = ?, ranch_name = ?, ranch_initials = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.name || null,
    body.phone || null,
    body.location || null,
    body.ranch_name || null,
    body.ranch_initials || null,
    user.id
  ).run();
  
  const updatedUser = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
  
  if (!updatedUser) {
    return c.json({ error: "Failed to get updated user" }, 500);
  }
  
  return c.json({
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    location: updatedUser.location,
    ranch_name: updatedUser.ranch_name,
    ranch_initials: updatedUser.ranch_initials,
  });
});



// Admin endpoint - Get all users with their data
app.get("/api/admin/users", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  console.log('[ADMIN v2] Fetching users - Admin:', mochaUser?.email);
  
  // Only saikopr1@gmail.com has admin access
  if (!mochaUser || mochaUser.email !== 'saikopr1@gmail.com') {
    console.log('[ADMIN v2] Access denied for:', mochaUser?.email);
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }
  
  try {
    // Query all users with rabbit counts and active status
    const query = `
      SELECT 
        u.id,
        u.mocha_user_id,
        u.email,
        u.tipo_plan,
        u.name,
        u.phone,
        u.location,
        u.created_at,
        u.updated_at,
        u.plan_expiry_date,
        u.billing_period,
        COUNT(r.id) as rabbit_count,
        CASE 
          WHEN u.plan_expiry_date IS NULL THEN 1
          WHEN DATE(u.plan_expiry_date) >= DATE('now') THEN 1
          ELSE 0
        END as is_active
      FROM users u
      LEFT JOIN rabbits r ON r.user_id = u.id
      GROUP BY u.id, u.mocha_user_id, u.email, u.tipo_plan, u.name, u.phone, u.location, u.created_at, u.updated_at, u.plan_expiry_date, u.billing_period
      ORDER BY u.created_at DESC
    `;
    
    const result = await db.prepare(query).all();
    console.log('[ADMIN v2] Query executed - Found', result.results.length, 'users');
    
    return c.json(result.results);
  } catch (error) {
    console.error('[ADMIN v2] Error fetching users:', error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Update user plan (admin only)
app.put("/api/admin/users/:id/plan", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const userId = c.req.param("id");
  const body = await c.req.json();
  
  console.log('[ADMIN API] Update plan request - User ID:', userId, 'New plan:', body.tipo_plan, 'Admin:', mochaUser?.email);
  
  if (!mochaUser || mochaUser.email !== 'saikopr1@gmail.com') {
    console.log('[ADMIN API] Access denied - User email:', mochaUser?.email);
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }
  
  try {
    // Calculate expiry date based on plan and billing period
    let expiryDate = null;
    
    if (body.tipo_plan === 'Ilimitado') {
      const today = new Date();
      if (body.billing_period === 'monthly') {
        today.setMonth(today.getMonth() + 1);
      } else if (body.billing_period === 'annual') {
        today.setFullYear(today.getFullYear() + 1);
      }
      expiryDate = today.toISOString().split('T')[0];
      console.log('[ADMIN API] Upgrading to Ilimitado - Expiry date:', expiryDate, 'Billing:', body.billing_period);
      
      await db.prepare("UPDATE users SET tipo_plan = ?, plan_expiry_date = ?, billing_period = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(body.tipo_plan, expiryDate, body.billing_period, userId).run();
    } else {
      console.log('[ADMIN API] Downgrading to Gratis - Clearing expiry');
      // Gratis plan has no expiry
      await db.prepare("UPDATE users SET tipo_plan = ?, plan_expiry_date = NULL, billing_period = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(body.tipo_plan, userId).run();
    }
    
    const updatedUser = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    console.log('[ADMIN API] Plan updated successfully:', updatedUser);
    return c.json(updatedUser);
  } catch (error) {
    console.error('[ADMIN API] Error updating plan:', error);
    return c.json({ error: "Database error" }, 500);
  }
});

// Delete user (admin only)
app.delete("/api/admin/users/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const userId = c.req.param("id");
  
  if (!mochaUser || mochaUser.email !== 'saikopr1@gmail.com') {
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }
  
  // PASO 1: Obtener todos los IDs de conejos del usuario
  const userRabbits = await db.prepare("SELECT id FROM rabbits WHERE user_id = ?").bind(userId).all();
  const rabbitIds = userRabbits.results.map((r: any) => r.id);
  
  if (rabbitIds.length > 0) {
    // PASO 2: Obtener todos los breeding_ids relacionados con los conejos del usuario
    const userBreedings = await db.prepare(`
      SELECT id FROM breedings WHERE male_id IN (${rabbitIds.join(',')}) OR female_id IN (${rabbitIds.join(',')})
    `).all();
    const breedingIds = userBreedings.results.map((b: any) => b.id);
    
    // PASO 3: Eliminar todas las camadas relacionadas con esos cruces
    if (breedingIds.length > 0) {
      await db.prepare(`DELETE FROM litters WHERE breeding_id IN (${breedingIds.join(',')})`).run();
    }
    
    // PASO 4: Eliminar todos los cruces del usuario
    await db.prepare(`DELETE FROM breedings WHERE male_id IN (${rabbitIds.join(',')}) OR female_id IN (${rabbitIds.join(',')})`).run();
    
    // PASO 5: Eliminar todos los conejos del usuario (incluyendo gazapos de camadas)
    await db.prepare("DELETE FROM rabbits WHERE user_id = ?").bind(userId).run();
  }
  
  // PASO 6: Eliminar el registro del usuario
  await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  
  // Los datos ahora están completamente eliminados de la base de datos D1 en el servidor
  // SQLite/D1 automáticamente libera el espacio mediante su sistema de VACUUM
  return c.json({ 
    success: true,
    message: 'Usuario y todos sus datos eliminados del servidor',
    deleted: {
      user_id: userId,
      rabbits: rabbitIds.length
    }
  });
});

// Upload rabbit photo (protected)
app.post("/api/rabbits/:id/photo", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify rabbit belongs to user
  const rabbit = await db.prepare(`
    SELECT id FROM rabbits WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!rabbit) {
    return c.json({ error: "Conejo no encontrado" }, 404);
  }
  
  try {
    console.log('[PHOTO] Starting photo upload for rabbit:', id);
    
    // Parse JSON body with base64 photo
    const body = await c.req.json();
    const { photo, filename: originalFilename, mimeType } = body;
    
    console.log('[PHOTO] Received photo data, mimeType:', mimeType);
    
    if (!photo || typeof photo !== 'string') {
      console.log('[PHOTO] No photo data received');
      return c.json({ error: "No se encontró la imagen" }, 400);
    }
    
    // Extract base64 data from data URL
    const base64Match = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      console.log('[PHOTO] Invalid base64 format');
      return c.json({ error: "Formato de imagen inválido" }, 400);
    }
    
    const detectedMimeType = base64Match[1];
    const base64Data = base64Match[2];
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('[PHOTO] Decoded image, size:', bytes.length, 'bytes');
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = originalFilename?.split('.').pop() || 'jpg';
    const r2Filename = `rabbits/${id}/${timestamp}.${extension}`;
    
    console.log('[PHOTO] Uploading to R2:', r2Filename);
    
    // Upload to R2
    await c.env.R2_BUCKET.put(r2Filename, bytes.buffer, {
      httpMetadata: {
        contentType: detectedMimeType || mimeType || 'image/jpeg',
      },
    });
    
    console.log('[PHOTO] Upload successful, updating database');
    
    // Update database with photo URL
    const photoUrl = `/api/photos/${r2Filename}`;
    await db.prepare(`
      UPDATE rabbits SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(photoUrl, id).run();
    
    console.log('[PHOTO] Photo URL saved:', photoUrl);
    
    return c.json({ photo_url: photoUrl });
  } catch (error) {
    console.error('[PHOTO] Error uploading photo:', error);
    return c.json({ error: "Error al subir la foto: " + (error as Error).message }, 500);
  }
});

// Get rabbit photo
app.get("/api/photos/*", async (c) => {
  const key = c.req.path.replace('/api/photos/', '');
  
  try {
    const object = await c.env.R2_BUCKET.get(key);
    
    if (!object) {
      return c.json({ error: "Foto no encontrada" }, 404);
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000");
    
    return c.body(object.body, { headers });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return c.json({ error: "Error al obtener la foto" }, 500);
  }
});

// ==================== WEIGHT HISTORY ENDPOINTS ====================

// Get weight history for a rabbit (protected)
app.get("/api/rabbits/:id/weight-history", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify rabbit belongs to user
  const rabbit = await db.prepare(`
    SELECT id FROM rabbits WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!rabbit) {
    return c.json({ error: "Conejo no encontrado" }, 404);
  }
  
  // Get weight history ordered by date (newest first)
  const weights = await db.prepare(`
    SELECT * FROM weight_history 
    WHERE rabbit_id = ? 
    ORDER BY weight_date DESC, created_at DESC
  `).bind(id).all();
  
  return c.json(weights.results);
});

// Add weight entry (protected)
app.post("/api/rabbits/:id/weight-history", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify rabbit belongs to user
  const rabbit = await db.prepare(`
    SELECT id FROM rabbits WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!rabbit) {
    return c.json({ error: "Conejo no encontrado" }, 404);
  }
  
  // Insert weight entry
  const result = await db.prepare(`
    INSERT INTO weight_history (rabbit_id, weight, weight_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(id, body.weight, body.weight_date, body.notes || null).run();
  
  const newWeight = await db.prepare("SELECT * FROM weight_history WHERE id = ?").bind(result.meta.last_row_id).first();
  
  // Also update the legacy weight field for backward compatibility
  await db.prepare(`
    UPDATE rabbits SET weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(body.weight, id).run();
  
  return c.json(newWeight);
});

// Delete weight entry (protected)
app.delete("/api/rabbits/:rabbitId/weight-history/:weightId", authMiddleware, async (c) => {
  const db = c.env.DB;
  const rabbitId = c.req.param("rabbitId");
  const weightId = c.req.param("weightId");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify rabbit belongs to user and weight entry belongs to rabbit
  const weight = await db.prepare(`
    SELECT wh.id 
    FROM weight_history wh
    JOIN rabbits r ON wh.rabbit_id = r.id
    WHERE wh.id = ? AND wh.rabbit_id = ? AND r.user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(weightId, rabbitId, mochaUser.id).first();
  
  if (!weight) {
    return c.json({ error: "Registro de peso no encontrado" }, 404);
  }
  
  await db.prepare("DELETE FROM weight_history WHERE id = ?").bind(weightId).run();
  
  return c.json({ success: true });
});

// ==================== CARCASS YIELDS ENDPOINTS ====================

// Get all carcass yields (protected)
// ==================== EXPENSES ENDPOINTS ====================

// Get all expenses (protected)
app.get("/api/expenses", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const expenses = await db.prepare(`
    SELECT * FROM expenses
    WHERE user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
    ORDER BY expense_date DESC
  `).bind(mochaUser.id).all();
  
  return c.json(expenses.results);
});

// Create expense (protected)
app.post("/api/expenses", authMiddleware, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await db.prepare("SELECT id FROM users WHERE mocha_user_id = ?").bind(mochaUser.id).first() as any;
  
  if (!user) {
    return c.json({ error: "Usuario no encontrado" }, 404);
  }
  
  const result = await db.prepare(`
    INSERT INTO expenses (user_id, expense_date, expense_type, description, amount, quantity, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    user.id,
    body.expense_date,
    body.expense_type,
    body.description,
    body.amount,
    body.quantity || null,
    body.notes || null
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// Update expense (protected)
app.put("/api/expenses/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Verify expense belongs to user
  const existing = await db.prepare(`
    SELECT id FROM expenses WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).first();
  
  if (!existing) {
    return c.json({ error: "Gasto no encontrado" }, 404);
  }
  
  await db.prepare(`
    UPDATE expenses 
    SET expense_date = ?, expense_type = ?, description = ?, amount = ?, quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.expense_date,
    body.expense_type,
    body.description,
    body.amount,
    body.quantity || null,
    body.notes || null,
    id
  ).run();
  
  return c.json({ success: true });
});

// Delete expense (protected)
app.delete("/api/expenses/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  await db.prepare(`
    DELETE FROM expenses WHERE id = ? AND user_id = (SELECT id FROM users WHERE mocha_user_id = ?)
  `).bind(id, mochaUser.id).run();
  
  return c.json({ success: true });
});

// ==================== MARKETPLACE ENDPOINTS ====================

// Get all marketplace posts with comments
app.get("/api/marketplace/posts", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  const isAdmin = mochaUser.email === 'saikopr1@gmail.com';
  
  try {
    // Get all posts with user info
    const postsResult = await db.prepare(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email
      FROM marketplace_posts p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
    
    // Get all comments
    const commentsResult = await db.prepare(`
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email
      FROM marketplace_comments c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at ASC
    `).all();
    
    // Group comments by post_id
    const commentsByPost = new Map<number, any[]>();
    for (const comment of commentsResult.results) {
      const postId = comment.post_id as number;
      if (!commentsByPost.has(postId)) {
        commentsByPost.set(postId, []);
      }
      commentsByPost.get(postId)!.push(comment);
    }
    
    // Attach comments to posts
    const posts = postsResult.results.map((post: any) => ({
      ...post,
      comments: commentsByPost.get(post.id) || [],
    }));
    
    return c.json({
      posts,
      current_user_id: user?.id || null,
      is_admin: isAdmin,
    });
  } catch (error) {
    console.error('[MARKETPLACE] Error fetching posts:', error);
    return c.json({ error: "Error al obtener las publicaciones" }, 500);
  }
});

// Create marketplace post
app.post("/api/marketplace/posts", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const body = await c.req.json();
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  if (!user) {
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  try {
    let photoUrl = body.photo_url;
    
    // If photo is a base64 data URL, upload to R2
    if (photoUrl && photoUrl.startsWith('data:')) {
      const base64Match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = mimeType.split('/')[1] || 'jpg';
        const r2Filename = `marketplace/${user.id}/${timestamp}.${extension}`;
        
        // Upload to R2
        await c.env.R2_BUCKET.put(r2Filename, bytes.buffer, {
          httpMetadata: { contentType: mimeType },
        });
        
        photoUrl = `/api/photos/${r2Filename}`;
      }
    }
    
    const result = await db.prepare(`
      INSERT INTO marketplace_posts (user_id, title, description, post_type, price, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      body.title,
      body.description || null,
      body.post_type || 'general',
      body.price || null,
      photoUrl || null
    ).run();
    
    const newPost = await db.prepare("SELECT * FROM marketplace_posts WHERE id = ?").bind(result.meta.last_row_id).first();
    
    // Push notifications disabled - code commented out
    console.log('[PUSH] Push notifications disabled');
    
    return c.json(newPost, 201);
  } catch (error) {
    console.error('[MARKETPLACE] Error creating post:', error);
    return c.json({ error: "Error al crear la publicación" }, 500);
  }
});

// Edit marketplace post (owner only)
app.put("/api/marketplace/posts/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const postId = c.req.param("id");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  
  // Check ownership
  const post = await db.prepare("SELECT user_id FROM marketplace_posts WHERE id = ?").bind(postId).first() as any;
  
  if (!post) {
    return c.json({ error: "Publicación no encontrada" }, 404);
  }
  
  if (post.user_id !== user?.id) {
    return c.json({ error: "No tienes permiso para editar esta publicación" }, 403);
  }
  
  try {
    const body = await c.req.json();
    const { title, description, post_type, price } = body;
    
    await db.prepare(`
      UPDATE marketplace_posts 
      SET title = ?, description = ?, post_type = ?, price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(title, description, post_type, price, postId).run();
    
    const updatedPost = await db.prepare("SELECT * FROM marketplace_posts WHERE id = ?").bind(postId).first();
    
    return c.json(updatedPost);
  } catch (error) {
    console.error('[MARKETPLACE] Error updating post:', error);
    return c.json({ error: "Error al actualizar la publicación" }, 500);
  }
});

// Delete marketplace post (owner or admin)
app.delete("/api/marketplace/posts/:id", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const postId = c.req.param("id");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  const isAdmin = mochaUser.email === 'saikopr1@gmail.com';
  
  // Check ownership
  const post = await db.prepare("SELECT user_id FROM marketplace_posts WHERE id = ?").bind(postId).first() as any;
  
  if (!post) {
    return c.json({ error: "Publicación no encontrada" }, 404);
  }
  
  if (post.user_id !== user?.id && !isAdmin) {
    return c.json({ error: "No tienes permiso para eliminar esta publicación" }, 403);
  }
  
  try {
    // Delete comments first
    await db.prepare("DELETE FROM marketplace_comments WHERE post_id = ?").bind(postId).run();
    // Delete post
    await db.prepare("DELETE FROM marketplace_posts WHERE id = ?").bind(postId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[MARKETPLACE] Error deleting post:', error);
    return c.json({ error: "Error al eliminar la publicación" }, 500);
  }
});

// Block/unblock marketplace post (admin only)
app.put("/api/marketplace/posts/:id/block", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const postId = c.req.param("id");
  
  if (!mochaUser || mochaUser.email !== 'saikopr1@gmail.com') {
    return c.json({ error: "Unauthorized - Admin access required" }, 403);
  }
  
  const post = await db.prepare("SELECT is_blocked FROM marketplace_posts WHERE id = ?").bind(postId).first() as any;
  
  if (!post) {
    return c.json({ error: "Publicación no encontrada" }, 404);
  }
  
  try {
    const newBlockedState = post.is_blocked ? 0 : 1;
    await db.prepare("UPDATE marketplace_posts SET is_blocked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(newBlockedState, postId).run();
    
    return c.json({ success: true, is_blocked: newBlockedState === 1 });
  } catch (error) {
    console.error('[MARKETPLACE] Error blocking post:', error);
    return c.json({ error: "Error al bloquear la publicación" }, 500);
  }
});

// Add comment to post
app.post("/api/marketplace/posts/:id/comments", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const postId = c.req.param("id");
  const body = await c.req.json();
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  if (!user) {
    return c.json({ error: "Failed to get user" }, 500);
  }
  
  // Check if post exists and is not blocked
  const post = await db.prepare("SELECT id, is_blocked FROM marketplace_posts WHERE id = ?").bind(postId).first() as any;
  
  if (!post) {
    return c.json({ error: "Publicación no encontrada" }, 404);
  }
  
  if (post.is_blocked) {
    return c.json({ error: "No se pueden agregar comentarios a publicaciones bloqueadas" }, 403);
  }
  
  try {
    const result = await db.prepare(`
      INSERT INTO marketplace_comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).bind(postId, user.id, body.content).run();
    
    const newComment = await db.prepare("SELECT * FROM marketplace_comments WHERE id = ?").bind(result.meta.last_row_id).first();
    
    // Create notification for post owner (only if commenter is not the owner)
    const postOwner = await db.prepare("SELECT user_id FROM marketplace_posts WHERE id = ?").bind(postId).first() as any;
    if (postOwner && postOwner.user_id !== user.id) {
      await db.prepare(`
        INSERT INTO notifications (user_id, post_id, comment_id, commenter_id)
        VALUES (?, ?, ?, ?)
      `).bind(postOwner.user_id, postId, result.meta.last_row_id, user.id).run();
      
      // Send push notification if user has subscription
      try {
        // Push notifications disabled
        // const subscriptions = await db.prepare(
        //   "SELECT * FROM push_subscriptions WHERE user_id = ?"
        // ).bind(postOwner.user_id).all();
        
        console.log('[PUSH] Comment notification disabled');
        
      } catch (pushError) {
        console.error('[PUSH] Error sending push notifications:', pushError);
      }
    }
    
    return c.json(newComment, 201);
  } catch (error) {
    console.error('[MARKETPLACE] Error adding comment:', error);
    return c.json({ error: "Error al agregar el comentario" }, 500);
  }
});

// Delete comment (owner or admin - soft delete)
app.delete("/api/marketplace/posts/:postId/comments/:commentId", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  const commentId = c.req.param("commentId");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  const isAdmin = mochaUser.email === 'saikopr1@gmail.com';
  
  // Check ownership
  const comment = await db.prepare("SELECT user_id FROM marketplace_comments WHERE id = ?").bind(commentId).first() as any;
  
  if (!comment) {
    return c.json({ error: "Comentario no encontrado" }, 404);
  }
  
  if (comment.user_id !== user?.id && !isAdmin) {
    return c.json({ error: "No tienes permiso para eliminar este comentario" }, 403);
  }
  
  try {
    // Soft delete - mark as deleted
    await db.prepare("UPDATE marketplace_comments SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(commentId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[MARKETPLACE] Error deleting comment:', error);
    return c.json({ error: "Error al eliminar el comentario" }, 500);
  }
});

// ==================== END MARKETPLACE ENDPOINTS ====================

// Get statistics (protected - user's own stats)
app.get("/api/stats", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const userIdSubquery = "(SELECT id FROM users WHERE mocha_user_id = ?)";
  
  const totalRabbits = await db.prepare(`SELECT COUNT(*) as count FROM rabbits WHERE user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  const males = await db.prepare(`SELECT COUNT(*) as count FROM rabbits WHERE sex = 'male' AND user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  const females = await db.prepare(`SELECT COUNT(*) as count FROM rabbits WHERE sex = 'female' AND user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  const pregnant = await db.prepare(`SELECT COUNT(*) as count FROM rabbits WHERE status = 'pregnant' AND user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  const activeBreedings = await db.prepare(`SELECT COUNT(*) as count FROM breedings WHERE status = 'pending' AND user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  const totalLitters = await db.prepare(`SELECT COUNT(*) as count FROM litters WHERE user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  const totalKits = await db.prepare(`SELECT SUM(total_kits) as sum FROM litters WHERE user_id = ${userIdSubquery}`).bind(mochaUser.id).first();
  
  return c.json({
    total_rabbits: totalRabbits?.count || 0,
    males: males?.count || 0,
    females: females?.count || 0,
    pregnant: pregnant?.count || 0,
    active_breedings: activeBreedings?.count || 0,
    total_litters: totalLitters?.count || 0,
    total_kits: totalKits?.sum || 0,
  });
});



// Subscribe to push notifications
app.post("/api/push-subscriptions", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const user = await getOrCreateUser(db, mochaUser);
  const body = await c.req.json();
  
  try {
    // Delete existing subscription with same endpoint
    await db.prepare(
      "DELETE FROM push_subscriptions WHERE endpoint = ?"
    ).bind(body.endpoint).run();
    
    // Insert new subscription
    await db.prepare(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, body.endpoint, body.keys.p256dh, body.keys.auth).run();
    
    return c.json({ success: true }, 201);
  } catch (error) {
    console.error('[PUSH] Error saving subscription:', error);
    return c.json({ error: "Error al guardar la suscripción" }, 500);
  }
});

// Unsubscribe from push notifications
app.delete("/api/push-subscriptions", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  
  try {
    await db.prepare(
      "DELETE FROM push_subscriptions WHERE endpoint = ?"
    ).bind(body.endpoint).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[PUSH] Error deleting subscription:', error);
    return c.json({ error: "Error al eliminar la suscripción" }, 500);
  }
});

// Check for upcoming important dates and send push notifications
app.post("/api/notifications/check-important-dates", authMiddleware, async (c) => {
  const db = c.env.DB;
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    // Get user from database
    const user = await db.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first() as any;
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get subscriptions for this user
    const subscriptions = await db.prepare(
      "SELECT * FROM push_subscriptions WHERE user_id = ?"
    ).bind(user.id).all();
    
    if (!subscriptions || !subscriptions.results || subscriptions.results.length === 0) {
      return c.json({ message: "No subscriptions found" });
    }
    
    let notificationsSent = 0;
    
    // Check for upcoming births (next 3 days)
    const breedings = await db.prepare(`
      SELECT b.*, r.name as female_name
      FROM breedings b
      LEFT JOIN rabbits r ON b.female_id = r.id
      WHERE b.user_id = ? AND b.status = 'pending' AND b.expected_birth_date IS NOT NULL
    `).bind(user.id).all();
    
    if (breedings && breedings.results) {
      for (const breeding of breedings.results as any[]) {
        const expectedDate = new Date(breeding.expected_birth_date);
        expectedDate.setHours(0, 0, 0, 0);
        
        const diffTime = expectedDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Send notification for births in 0, 1, 2, or 3 days
        if (daysUntil >= 0 && daysUntil <= 3) {
          // const femaleName = breeding.female_name || 'Coneja';
          // let message = '';
          // if (daysUntil === 0) { message = `¡Parto de ${femaleName} programado para HOY!`; }
          // else if (daysUntil === 1) { message = `Parto de ${femaleName} programado para mañana`; }
          // else { message = `Parto de ${femaleName} en ${daysUntil} días`; }
          
          // Send to all user subscriptions - DISABLED
          // for (const sub of subscriptions.results as any[]) { ... }
          console.log('[PUSH] Birth notification disabled');
          notificationsSent++;
        }
      }
    }
    
    // Check for upcoming weanings (next 3 days)
    const litters = await db.prepare(`
      SELECT l.*, r.name as female_name
      FROM litters l
      LEFT JOIN rabbits r ON l.female_id = r.id
      WHERE l.user_id = ? AND l.weaning_date IS NOT NULL AND l.alive_kits > 0
    `).bind(user.id).all();
    
    if (litters && litters.results) {
      for (const litter of litters.results as any[]) {
        const weaningDate = new Date(litter.weaning_date);
        weaningDate.setHours(0, 0, 0, 0);
        
        const diffTime = weaningDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Send notification for weanings in 0, 1, 2, or 3 days
        if (daysUntil >= 0 && daysUntil <= 3) {
          // const femaleName = litter.female_name || 'Camada';
          // let message = '';
          // if (daysUntil === 0) { message = `¡Destete de ${femaleName} programado para HOY! (${litter.alive_kits} gazapos)`; }
          // else if (daysUntil === 1) { message = `Destete de ${femaleName} programado para mañana (${litter.alive_kits} gazapos)`; }
          // else { message = `Destete de ${femaleName} en ${daysUntil} días (${litter.alive_kits} gazapos)`; }
          
          // Send to all user subscriptions
          // Push notifications disabled
          console.log('[PUSH] Weaning notification disabled');
          notificationsSent++;
        }
      }
    }
    
    return c.json({ 
      success: true, 
      notificationsSent,
      message: `${notificationsSent} notificaciones enviadas`
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error checking important dates:', error);
    return c.json({ error: "Error al verificar fechas importantes" }, 500);
  }
});

export default app;
