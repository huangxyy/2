<template>
  <div
    data-testid="challenge-card"
    class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
    @click="$emit('click')"
  >
    <!-- Previous template content -->
    <span
      data-testid="difficulty-badge"
      :class="getDifficultyClass(challenge.difficulty_level)"
      class="px-2 py-1 text-xs font-semibold rounded-full"
    >
      {{ getDifficultyLabel(challenge.difficulty_level) }}
    </span>
    <!-- Rest of the template -->
  </div>
</template>