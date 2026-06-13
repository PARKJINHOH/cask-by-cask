package com.caskbycask.domain.nicknamebadword.service;

import com.caskbycask.domain.nicknamebadword.dto.CreateNicknameBadWordRequest;
import com.caskbycask.domain.nicknamebadword.dto.NicknameBadWordResponse;
import com.caskbycask.domain.nicknamebadword.entity.NicknameBadWord;
import com.caskbycask.domain.nicknamebadword.repository.NicknameBadWordRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NicknameBadWordService {

    private final NicknameBadWordRepository repository;
    private final NicknameBadWordValidator validator;

    @Transactional(readOnly = true)
    public Page<NicknameBadWordResponse> getAll(int page, int size) {
        return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(NicknameBadWordResponse::from);
    }

    @Transactional
    public NicknameBadWordResponse create(CreateNicknameBadWordRequest request) {
        String word = request.getWord().strip();

        if (repository.existsByWord(word)) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME_BAD_WORD);
        }

        NicknameBadWord badWord = NicknameBadWord.builder()
                .word(word)
                .isActive(true)
                .build();

        NicknameBadWordResponse response = NicknameBadWordResponse.from(repository.save(badWord));
        validator.refreshCache();
        return response;
    }

    @Transactional
    public void delete(Long id) {
        NicknameBadWord badWord = findById(id);
        repository.delete(badWord);
        validator.refreshCache();
    }

    @Transactional
    public NicknameBadWordResponse toggle(Long id) {
        NicknameBadWord badWord = findById(id);
        badWord.setIsActive(!badWord.getIsActive());
        NicknameBadWordResponse response = NicknameBadWordResponse.from(badWord);
        validator.refreshCache();
        return response;
    }

    private NicknameBadWord findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NICKNAME_BAD_WORD_NOT_FOUND));
    }
}
