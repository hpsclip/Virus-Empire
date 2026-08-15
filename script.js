"use strict";

/*
    VIRUS EMPIRE
    v0.1.0
*/

const SAVE_KEY = "virusEmpireSave_v1";

let game = {
    infections: 0,
    totalInfections: 0,

    dna: 0,
    totalDNA: 0,

    research: 0,
    researchLevel: 1,

    mutations: 0,

    playTime: 0,
    lastSave: Date.now(),

    upgrades: {
        replication: 0,
        incubation: 0,
        spreading: 0,
        resilience: 0
    },

    mutationLevels: {
        aggressive: 0,
        rapid: 0,
        adaptive: 0
    },

    achievements: []
};

const upgrades = {
    replication: {
        name: "Replication",
        description: "+1 infection/sec per level.",
        baseCost: 15,
        costMultiplier: 1.55,
        effect: 1,
        currency: "dna"
    },

    incubation: {
        name: "Fast Incubation",
        description: "+5% infection production per level.",
        baseCost: 50,
        costMultiplier: 1.75,
        effect: 0.05,
        currency: "dna"
    },

    spreading: {
        name: "Rapid Spread",
        description: "+10% manual infection power per level.",
        baseCost: 100,
        costMultiplier: 1.85,
        effect: 0.10,
        currency: "dna"
    },

    resilience: {
        name: "Cell Resilience",
        description: "Every level increases DNA production.",
        baseCost: 250,
        costMultiplier: 2,
        effect: 0.25,
        currency: "dna"
    }
};

const mutations = {
    aggressive: {
        name: "Aggressive Strain",
        description: "+25% infection/sec.",
        baseCost: 2,
        costMultiplier: 2,
        effect: 0.25
    },

    rapid: {
        name: "Rapid Mutation",
        description: "+1 DNA/sec.",
        baseCost: 5,
        costMultiplier: 2.2,
        effect: 1
    },

    adaptive: {
        name: "Adaptive Genome",
        description: "+50% research generation.",
        baseCost: 10,
        costMultiplier: 2.5,
        effect: 0.5
    }
};

const achievementList = [
    {
        id: "first",
        name: "Patient Zero",
        description: "Reach 1 infection.",
        check: () => game.totalInfections >= 1
    },

    {
        id: "hundred",
        name: "First Outbreak",
        description: "Reach 100 infections.",
        check: () => game.totalInfections >= 100
    },

    {
        id: "thousand",
        name: "Growing Threat",
        description: "Reach 1,000 infections.",
        check: () => game.totalInfections >= 1000
    },

    {
        id: "dna",
        name: "Genetic Discovery",
        description: "Collect 100 DNA.",
        check: () => game.totalDNA >= 100
    },

    {
        id: "mutation",
        name: "Evolution Begins",
        description: "Unlock a mutation.",
        check: () => game.mutations >= 1
    },

    {
        id: "research",
        name: "The Lab",
        description: "Reach research level 5.",
        check: () => game.researchLevel >= 5
    }
];

function formatNumber(number) {
    if (!Number.isFinite(number)) return "0";

    if (number < 1000) {
        return Math.floor(number).toLocaleString();
    }

    const suffixes = ["K", "M", "B", "T", "Qa", "Qi"];

    let index = -1;
    let value = number;

    while (value >= 1000 && index < suffixes.length - 1) {
        value /= 1000;
        index++;
    }

    return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2) + suffixes[index];
}

function getUpgradeCost(id) {
    const upgrade = upgrades[id];
    const level = game.upgrades[id];

    return Math.floor(
        upgrade.baseCost * Math.pow(upgrade.costMultiplier, level)
    );
}

function getMutationCost(id) {
    const mutation = mutations[id];
    const level = game.mutationLevels[id];

    return Math.floor(
        mutation.baseCost * Math.pow(mutation.costMultiplier, level)
    );
}

function getInfectionPerSecond() {
    let base = game.upgrades.replication;

    let multiplier = 1;

    multiplier += game.upgrades.incubation *
        upgrades.incubation.effect;

    multiplier += game.mutationLevels.aggressive *
        mutations.aggressive.effect;

    return base * multiplier;
}

function getManualPower() {
    let power = 1;

    power *= 1 + (
        game.upgrades.spreading *
        upgrades.spreading.effect
    );

    return power;
}

function getDNAPerSecond() {
    let value = game.upgrades.resilience *
        upgrades.resilience.effect;

    value += game.mutationLevels.rapid *
        mutations.rapid.effect;

    return value;
}

function getResearchPerSecond() {
    let value = 0.1;

    value *= 1 + (
        game.mutationLevels.adaptive *
        mutations.adaptive.effect
    );

    return value;
}

function infect(amount = getManualPower()) {
    game.infections += amount;
    game.totalInfections += amount;

    checkAchievements();
    updateUI();
}

function generateResources(delta) {
    const infectionRate = getInfectionPerSecond();

    const infections = infectionRate * delta;

    game.infections += infections;
    game.totalInfections += infections;

    const dna = getDNAPerSecond() * delta;

    game.dna += dna;
    game.totalDNA += dna;

    game.research += getResearchPerSecond() * delta;

    if (game.research >= 100) {
        const levels = Math.floor(game.research / 100);

        game.research -= levels * 100;
        game.researchLevel += levels;
    }

    game.playTime += delta;
}

function buyUpgrade(id) {
    const upgrade = upgrades[id];
    const cost = getUpgradeCost(id);

    if (game[upgrade.currency] < cost) return;

    game[upgrade.currency] -= cost;
    game.upgrades[id]++;

    saveGame();
    updateUI();
}

function buyMutation(id) {
    const mutation = mutations[id];
    const cost = getMutationCost(id);

    if (game.mutations < cost) return;

    game.mutations -= cost;
    game.mutationLevels[id]++;

    saveGame();
    updateUI();
}

function research() {
    if (game.research < 25) return;

    game.research -= 25;

    game.dna += game.researchLevel * 2;
    game.totalDNA += game.researchLevel * 2;

    checkAchievements();
    saveGame();
    updateUI();
}

function renderUpgrades() {
    const container = document.getElementById("upgrades");

    container.innerHTML = "";

    Object.keys(upgrades).forEach(id => {

        const upgrade = upgrades[id];
        const level = game.upgrades[id];
        const cost = getUpgradeCost(id);

        const element = document.createElement("div");
        element.className = "upgrade";

        element.innerHTML = `
            <div class="item-info">
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
                <div class="level">LEVEL ${level}</div>
            </div>

            <button
                class="buy-button"
                ${game.dna < cost ? "disabled" : ""}
                data-upgrade="${id}">
                🧬 ${formatNumber(cost)}
            </button>
        `;

        container.appendChild(element);
    });

    container.querySelectorAll("[data-upgrade]").forEach(button => {
        button.addEventListener("click", () => {
            buyUpgrade(button.dataset.upgrade);
        });
    });
}

function renderMutations() {
    const container = document.getElementById("mutations");

    container.innerHTML = "";

    Object.keys(mutations).forEach(id => {

        const mutation = mutations[id];
        const level = game.mutationLevels[id];
        const cost = getMutationCost(id);

        const element = document.createElement("div");
        element.className = "mutation";

        element.innerHTML = `
            <div class="item-info">
                <h3>${mutation.name}</h3>
                <p>${mutation.description}</p>
                <div class="level">LEVEL ${level}</div>
            </div>

            <button
                class="buy-button"
                ${game.mutations < cost ? "disabled" : ""}
                data-mutation="${id}">
                ☣️ ${formatNumber(cost)}
            </button>
        `;

        container.appendChild(element);
    });

    container.querySelectorAll("[data-mutation]").forEach(button => {
        button.addEventListener("click", () => {
            buyMutation(button.dataset.mutation);
        });
    });
}

function renderAchievements() {
    const container = document.getElementById("achievements");

    container.innerHTML = "";

    let unlocked = 0;

    achievementList.forEach(achievement => {

        const isUnlocked =
            game.achievements.includes(achievement.id);

        if (isUnlocked) unlocked++;

        const element = document.createElement("div");

        element.className =
            "achievement" +
            (isUnlocked ? " unlocked" : "");

        element.innerHTML = `
            <strong>
                ${isUnlocked ? "✓" : "○"} ${achievement.name}
            </strong>

            <span>${achievement.description}</span>
        `;

        container.appendChild(element);
    });

    document.getElementById("achievementProgress").textContent =
        `${unlocked} / ${achievementList.length}`;
}

function checkAchievements() {

    let changed = false;

    achievementList.forEach(achievement => {

        if (
            !game.achievements.includes(achievement.id) &&
            achievement.check()
        ) {
            game.achievements.push(achievement.id);
            changed = true;
        }
    });

    if (changed) {
        saveGame();
    }
}

function formatTime(seconds) {

    seconds = Math.floor(seconds);

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

function updateUI() {

    document.getElementById("infectionCount").textContent =
        formatNumber(game.infections);

    document.getElementById("infectionRate").textContent =
        formatNumber(getInfectionPerSecond());

    document.getElementById("dna").textContent =
        formatNumber(game.dna);

    document.getElementById("research").textContent =
        Math.floor(game.research) + " / 100";

    document.getElementById("mutationCount").textContent =
        formatNumber(game.mutations);

    document.getElementById("researchLevel").textContent =
        game.researchLevel;

    document.getElementById("researchLevelText").textContent =
        "LEVEL " + game.researchLevel;

    document.getElementById("totalInfections").textContent =
        formatNumber(game.totalInfections);

    document.getElementById("totalDNA").textContent =
        formatNumber(game.totalDNA);

    document.getElementById("playTime").textContent =
        formatTime(game.playTime);

    renderUpgrades();
    renderMutations();
    renderAchievements();
}

function saveGame() {

    game.lastSave = Date.now();

    localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(game)
    );

    const status = document.getElementById("saveStatus");

    if (status) {
        status.textContent = "SAVED";

        setTimeout(() => {
            if (status) status.textContent = "ONLINE";
        }, 1000);
    }
}

function loadGame() {

    const saved = localStorage.getItem(SAVE_KEY);

    if (!saved) return;

    try {

        const parsed = JSON.parse(saved);

        game = {
            ...game,
            ...parsed,

            upgrades: {
                ...game.upgrades,
                ...(parsed.upgrades || {})
            },

            mutationLevels: {
                ...game.mutationLevels,
                ...(parsed.mutationLevels || {})
            }
        };

        /*
            Offline progress
        */

        const elapsed =
            Math.min(
                (Date.now() - game.lastSave) / 1000,
                60 * 60 * 8
            );

        if (elapsed > 5) {

            const infections =
                getInfectionPerSecond() * elapsed;

            const dna =
                getDNAPerSecond() * elapsed;

            game.infections += infections;
            game.totalInfections += infections;

            game.dna += dna;
            game.totalDNA += dna;

            game.research +=
                getResearchPerSecond() * elapsed;

            game.playTime += elapsed;

            if (game.research >= 100) {
                const levels =
                    Math.floor(game.research / 100);

                game.research -= levels * 100;
                game.researchLevel += levels;
            }
        }

    } catch (error) {

        console.error(
            "Virus Empire save could not be loaded:",
            error
        );
    }
}

document
    .getElementById("infectButton")
    .addEventListener("click", () => {
        infect();
    });

document
    .getElementById("researchButton")
    .addEventListener("click", () => {
        research();
    });

document
    .getElementById("resetButton")
    .addEventListener("click", () => {

        const confirmed = confirm(
            "RESET YOUR VIRUS EMPIRE?\n\nThis will permanently delete your save."
        );

        if (!confirmed) return;

        localStorage.removeItem(SAVE_KEY);

        location.reload();
    });

loadGame();
updateUI();

/*
    Main idle loop
*/

let lastTick = Date.now();

setInterval(() => {

    const now = Date.now();

    let delta =
        (now - lastTick) / 1000;

    delta = Math.min(delta, 1);

    lastTick = now;

    generateResources(delta);
    checkAchievements();
    updateUI();

}, 250);

/*
    Auto-save
*/

setInterval(() => {
    saveGame();
}, 10000);

/*
    Save when leaving
*/

window.addEventListener("beforeunload", () => {
    saveGame();
});
