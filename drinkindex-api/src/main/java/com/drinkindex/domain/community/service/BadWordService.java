package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.BadWordResponse;
import com.drinkindex.domain.community.dto.CreateBadWordRequest;
import com.drinkindex.domain.community.entity.BadWord;
import com.drinkindex.domain.community.repository.BadWordRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BadWordService {

    private final BadWordRepository badWordRepository;
    private final BadWordFilter badWordFilter;

    @Transactional(readOnly = true)
    public Page<BadWordResponse> getAll(int page, int size) {
        return badWordRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(BadWordResponse::from);
    }

    @Transactional
    public BadWordResponse create(CreateBadWordRequest request) {
        String word = request.getWord().strip();

        if (badWordRepository.existsByWord(word)) {
            throw new CustomException(ErrorCode.DUPLICATE_BAD_WORD);
        }

        BadWord badWord = BadWord.builder()
                .word(word)
                .isActive(true)
                .build();

        BadWordResponse response = BadWordResponse.from(badWordRepository.save(badWord));
        badWordFilter.refreshCache();
        return response;
    }

    @Transactional
    public void delete(Long id) {
        BadWord badWord = findById(id);
        badWordRepository.delete(badWord);
        badWordFilter.refreshCache();
    }

    @Transactional
    public BadWordResponse toggle(Long id) {
        BadWord badWord = findById(id);
        badWord.setIsActive(!badWord.getIsActive());
        BadWordResponse response = BadWordResponse.from(badWord);
        badWordFilter.refreshCache();
        return response;
    }

    private BadWord findById(Long id) {
        return badWordRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.BAD_WORD_NOT_FOUND));
    }
}
